using FluentA.Application.BoundedContexts.Notification;
using FluentA.Domain.BoundedContexts.Countdown.Services;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using FluentA.Domain.BoundedContexts.Todo.Services;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Infrastructure.BackgroundJobs;

/// <summary>
/// Executes one persisted productivity occurrence.
///
/// Quartz owns when a trigger is delivered.  This adapter owns the business
/// revalidation at delivery time: a changed reminder, completed item, changed
/// countdown occurrence, or expired Vietnam calendar day makes the trigger a
/// no-op.  Every successful claim and notification insert is committed in one
/// transaction while the business row is locked.
/// </summary>
public sealed class ScheduledProductivityExecution : IScheduledOccurrenceExecutor
{
    private static readonly TimeZoneInfo VietnamTimeZone = ScheduledProductivityJobKeys.ResolveVietnamTimeZone();

    private readonly AppDbContext _dbContext;
    private readonly ILogger<ScheduledProductivityExecution> _logger;
    private readonly INotificationSyncNotifier? _notificationSyncNotifier;

    public ScheduledProductivityExecution(
        AppDbContext dbContext,
        ILogger<ScheduledProductivityExecution> logger,
        INotificationSyncNotifier? notificationSyncNotifier = null)
    {
        _dbContext = dbContext;
        _logger = logger;
        _notificationSyncNotifier = notificationSyncNotifier;
    }

    public async Task ExecuteAsync(ScheduledOccurrence occurrence, CancellationToken cancellationToken = default)
    {
        switch (occurrence.Kind)
        {
            case ScheduledOccurrenceKind.TodoReminder:
                await ExecuteTodoReminderAsync(occurrence.SourceId, occurrence.ScheduledAtUtcNormalized, cancellationToken);
                break;
            case ScheduledOccurrenceKind.HabitReminder:
                await ExecuteHabitReminderAsync(occurrence.SourceId, occurrence.OccurrenceDateUtc,
                    occurrence.ScheduledAtUtcNormalized, cancellationToken);
                break;
            case ScheduledOccurrenceKind.CountdownAlert:
                var countdownId = await _dbContext.CountdownAlerts.AsNoTracking()
                    .Where(alert => alert.Id == occurrence.SourceId)
                    .Select(alert => (Guid?)alert.CountdownId).SingleOrDefaultAsync(cancellationToken);
                if (countdownId.HasValue)
                    await ExecuteCountdownAlertAsync(countdownId.Value, occurrence.SourceId,
                        occurrence.OccurrenceDateUtc, occurrence.ScheduledAtUtcNormalized, cancellationToken);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(occurrence));
        }
    }

    /// <summary>
    /// Executes a todo reminder occurrence using the current clock.
    /// </summary>
    public Task ExecuteTodoReminderAsync(
        Guid todoId,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken = default) =>
        ExecuteTodoReminderAsync(todoId, scheduledAtUtc, DateTime.UtcNow, cancellationToken);

    /// <summary>
    /// Executes a todo reminder occurrence at an explicit instant.  The
    /// explicit clock is intentionally public so the scheduler and tests can
    /// prove missed-delivery behavior without relying on machine time.
    /// </summary>
    public async Task ExecuteTodoReminderAsync(
        Guid todoId,
        DateTime scheduledAtUtc,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        if (todoId == Guid.Empty || !IsUtc(scheduledAtUtc) || !IsUtc(nowUtc))
        {
            return;
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var item = await LockTodoAsync(todoId, cancellationToken);
        if (item is null
            || item.DeletedAt is not null
            || item.IsCompleted
            || item.ReminderSentAtUtc is not null
            || item.ReminderScheduledAtUtc != scheduledAtUtc
            || scheduledAtUtc > nowUtc)
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var deduplicationKey = ScheduledProductivityJobKeys.TodoReminder(item.Id, scheduledAtUtc);
        var created = await AddNotificationIfMissingAsync(
            item.UserId,
            "TodoReminder",
            "Todo reminder",
            item.Title,
            deduplicationKey,
            $"/todo?taskId={item.Id}",
            cancellationToken);

        item.MarkReminderSent(nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (created)
        {
            await NotifyChangedAsync(item.UserId, cancellationToken);
        }

        _logger.LogInformation(
            "Todo reminder occurrence {TodoId} at {ScheduledAtUtc} was claimed; notificationCreated={NotificationCreated}.",
            item.Id,
            scheduledAtUtc,
            created);
    }

    /// <summary>
    /// Executes a habit reminder for one Vietnam calendar date using the
    /// current clock.
    /// </summary>
    public Task ExecuteHabitReminderAsync(
        Guid habitId,
        DateOnly occurrenceDate,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken = default) =>
        ExecuteHabitReminderAsync(
            habitId,
            occurrenceDate.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc),
            scheduledAtUtc,
            DateTime.UtcNow,
            cancellationToken);

    /// <summary>
    /// DateTime overload for Quartz job-data serializers that do not preserve
    /// <see cref="DateOnly"/> values.
    /// </summary>
    public Task ExecuteHabitReminderAsync(
        Guid habitId,
        DateTime occurrenceDate,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken = default) =>
        ExecuteHabitReminderAsync(
            habitId,
            occurrenceDate,
            scheduledAtUtc,
            DateTime.UtcNow,
            cancellationToken);

    /// <summary>
    /// Executes one habit reminder at an explicit instant.  A habit reminder
    /// is eligible only for the current Vietnam day; delayed delivery after
    /// midnight is deliberately skipped rather than sent for yesterday.
    /// </summary>
    public async Task ExecuteHabitReminderAsync(
        Guid habitId,
        DateTime occurrenceDate,
        DateTime scheduledAtUtc,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        if (habitId == Guid.Empty || !IsUtc(scheduledAtUtc) || !IsUtc(nowUtc))
        {
            return;
        }

        var occurrenceDay = DateTime.SpecifyKind(occurrenceDate.Date, DateTimeKind.Utc);
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, VietnamTimeZone);
        var today = DateTime.SpecifyKind(localNow.Date, DateTimeKind.Utc);
        if (today != occurrenceDay || scheduledAtUtc > nowUtc)
        {
            return;
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var habit = await LockHabitAsync(habitId, cancellationToken);
        if (habit is null
            || habit.DeletedAt is not null
            || !habit.ReminderEnabled
            || habit.LastReminderSentOn == today
            || !habit.IsEligibleOn(today)
            || !IsExpectedHabitOccurrence(habit.ReminderTime, occurrenceDay, scheduledAtUtc))
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var hasEntry = await _dbContext.HabitEntries.AnyAsync(
            entry => entry.HabitId == habit.Id
                && entry.Date == today
                && entry.DeletedAt == null,
            cancellationToken);
        if (hasEntry)
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        if (habit.GoalDays.HasValue)
        {
            var entryCount = await _dbContext.HabitEntries.CountAsync(
                entry => entry.HabitId == habit.Id && entry.DeletedAt == null,
                cancellationToken);
            if (entryCount >= habit.GoalDays.Value)
            {
                await transaction.CommitAsync(cancellationToken);
                return;
            }
        }

        var deduplicationKey = ScheduledProductivityJobKeys.HabitReminder(habit.Id, today);
        var created = await AddNotificationIfMissingAsync(
            habit.UserId,
            "HabitReminder",
            "Habit reminder",
            $"You have not checked off {habit.Name} today.",
            deduplicationKey,
            null,
            cancellationToken);

        habit.MarkReminderSent(today);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (created)
        {
            await NotifyChangedAsync(habit.UserId, cancellationToken);
        }

        _logger.LogInformation(
            "Habit reminder occurrence {HabitId} on Vietnam date {Date} was claimed; notificationCreated={NotificationCreated}.",
            habit.Id,
            today,
            created);
    }

    /// <summary>
    /// Executes a countdown alert occurrence.  The target date is part of the
    /// trigger identity so a recurrence update can invalidate an old trigger
    /// even when the alert row id is reused.
    /// </summary>
    public Task ExecuteCountdownAlertAsync(
        Guid countdownId,
        Guid alertId,
        DateTime targetDate,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken = default) =>
        ExecuteCountdownAlertAsync(
            countdownId,
            alertId,
            targetDate,
            scheduledAtUtc,
            DateTime.UtcNow,
            cancellationToken);

    /// <summary>
    /// Compatibility overload for schedulers that use the alert's persisted
    /// target date and only carry the alert schedule instant in job data.
    /// </summary>
    public Task ExecuteCountdownAlertAsync(
        Guid countdownId,
        Guid alertId,
        DateTime scheduledAtUtc,
        CancellationToken cancellationToken = default) =>
        ExecuteCountdownAlertAsync(
            countdownId,
            alertId,
            targetDate: null,
            scheduledAtUtc,
            DateTime.UtcNow,
            cancellationToken);

    public async Task ExecuteCountdownAlertAsync(
        Guid countdownId,
        Guid alertId,
        DateTime? targetDate,
        DateTime scheduledAtUtc,
        DateTime nowUtc,
        CancellationToken cancellationToken = default)
    {
        if (countdownId == Guid.Empty || alertId == Guid.Empty || !IsUtc(scheduledAtUtc) || !IsUtc(nowUtc))
        {
            return;
        }

        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var countdown = await LockCountdownAsync(countdownId, cancellationToken);
        if (countdown is null || countdown.DeletedAt is not null)
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var alert = await LockCountdownAlertAsync(countdownId, alertId, cancellationToken);
        var occurrenceTarget = DateTime.SpecifyKind((targetDate ?? countdown.TargetDate).Date, DateTimeKind.Utc);
        var isCurrentTarget = occurrenceTarget == countdown.TargetDate;
        var isNextTarget = countdown.RepeatPattern != CountdownRepeatPattern.None
            && occurrenceTarget == CountdownSchedule.NextTargetDate(countdown.TargetDate,
                countdown.RepeatPattern, countdown.TargetDate.AddDays(1));
        if (alert is null
            || alert.DeletedAt is not null
            || (!isCurrentTarget && !isNextTarget)
            || (isCurrentTarget && (alert.FiredAtUtc is not null || alert.ScheduledAtUtc != scheduledAtUtc))
            || (isNextTarget && CountdownSchedule.BuildAlertScheduledAtUtc(
                occurrenceTarget, alert.AlertDay, alert.AlertTime) != scheduledAtUtc)
            || scheduledAtUtc > nowUtc)
        {
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, VietnamTimeZone);
        if (localNow.Date > occurrenceTarget.Date)
        {
            // A delayed alert is valid through the end of its target Vietnam
            // day only.  A trigger from a previous recurrence must never fire
            // after its target day has ended.
            await transaction.CommitAsync(cancellationToken);
            return;
        }

        var deduplicationKey = ScheduledProductivityJobKeys.CountdownAlert(
            countdown.Id,
            occurrenceTarget,
            alert.Id);
        var created = await AddNotificationIfMissingAsync(
            countdown.UserId,
            "CountdownAlert",
            "Countdown reminder",
            $"{countdown.Name} - {alert.AlertDay} at {alert.AlertTime}.",
            deduplicationKey,
            null,
            cancellationToken);

        // A future cycle must not consume the current cycle's fired marker.
        // Its notification key is the durable claim until recurrence advances.
        if (isCurrentTarget) alert.MarkFired(nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);

        if (created)
        {
            await NotifyChangedAsync(countdown.UserId, cancellationToken);
        }

        _logger.LogInformation(
            "Countdown alert occurrence {CountdownId}/{AlertId} for target {TargetDate} was claimed; notificationCreated={NotificationCreated}.",
            countdown.Id,
            alert.Id,
            occurrenceTarget,
            created);
    }

    private async Task<bool> AddNotificationIfMissingAsync(
        Guid userId,
        string type,
        string title,
        string message,
        string deduplicationKey,
        string? actionPath,
        CancellationToken cancellationToken)
    {
        var exists = await _dbContext.Notifications.AnyAsync(
            notification => notification.UserId == userId
                && notification.DeduplicationKey == deduplicationKey,
            cancellationToken);
        if (exists)
        {
            return false;
        }

        _dbContext.Notifications.Add(NotificationEntity.Create(
            userId,
            type,
            title,
            message,
            deduplicationKey,
            actionPath));
        return true;
    }

    private async Task NotifyChangedAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (_notificationSyncNotifier is null)
        {
            return;
        }

        try
        {
            await _notificationSyncNotifier.NotificationsChangedAsync(userId, cancellationToken);
        }
        catch (Exception exception)
        {
            // The notification row is already committed.  A transient SignalR
            // failure must not cause Quartz to retry the business operation and
            // create a second occurrence notification.
            _logger.LogWarning(
                exception,
                "Notification sync push failed for user {UserId}; the persisted notification remains authoritative.",
                userId);
        }
    }

    private async Task<FluentA.Domain.BoundedContexts.Todo.Entities.TodoItem?> LockTodoAsync(
        Guid todoId,
        CancellationToken cancellationToken)
    {
        if (UsesPostgres())
        {
            return await _dbContext.TodoItems
                .FromSqlInterpolated($"SELECT * FROM todo_items WHERE id = {todoId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);
        }

        return await _dbContext.TodoItems.SingleOrDefaultAsync(item => item.Id == todoId, cancellationToken);
    }

    private async Task<FluentA.Domain.BoundedContexts.Habit.Entities.Habit?> LockHabitAsync(
        Guid habitId,
        CancellationToken cancellationToken)
    {
        if (UsesPostgres())
        {
            return await _dbContext.Habits
                .FromSqlInterpolated($"SELECT * FROM habits WHERE id = {habitId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);
        }

        return await _dbContext.Habits.SingleOrDefaultAsync(habit => habit.Id == habitId, cancellationToken);
    }

    private async Task<FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent?> LockCountdownAsync(
        Guid countdownId,
        CancellationToken cancellationToken)
    {
        if (UsesPostgres())
        {
            return await _dbContext.CountdownEvents
                .FromSqlInterpolated($"SELECT * FROM countdowns WHERE id = {countdownId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);
        }

        return await _dbContext.CountdownEvents
            .SingleOrDefaultAsync(countdown => countdown.Id == countdownId, cancellationToken);
    }

    private async Task<FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownAlert?> LockCountdownAlertAsync(
        Guid countdownId,
        Guid alertId,
        CancellationToken cancellationToken)
    {
        if (UsesPostgres())
        {
            return await _dbContext.CountdownAlerts
                .FromSqlInterpolated($"SELECT * FROM countdown_alerts WHERE id = {alertId} AND countdown_id = {countdownId} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);
        }

        return await _dbContext.CountdownAlerts.SingleOrDefaultAsync(
            alert => alert.Id == alertId && alert.CountdownId == countdownId,
            cancellationToken);
    }

    private bool UsesPostgres() =>
        _dbContext.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) == true;

    private static bool IsExpectedHabitOccurrence(TimeOnly reminderTime, DateTime occurrenceDate, DateTime scheduledAtUtc)
    {
        var expected = TimeZoneInfo.ConvertTimeToUtc(
            DateTime.SpecifyKind(occurrenceDate.Date.Add(reminderTime.ToTimeSpan()), DateTimeKind.Unspecified),
            VietnamTimeZone);
        return expected == scheduledAtUtc;
    }

    private static bool IsUtc(DateTime value) => value.Kind == DateTimeKind.Utc;
}
