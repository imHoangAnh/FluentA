using FluentA.Application.BoundedContexts.Notification;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Infrastructure.BackgroundJobs;

/// <summary>
/// Executes one persisted productivity occurrence.
///
/// The polling service finds due work. This adapter owns the business
/// revalidation at delivery time: a changed habit reminder or an expired
/// Vietnam calendar day makes the trigger a no-op. Every successful
/// claim and notification insert is committed in one
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
            case ScheduledOccurrenceKind.HabitReminder:
                await ExecuteHabitReminderAsync(occurrence.SourceId, occurrence.OccurrenceDateUtc,
                    occurrence.ScheduledAtUtcNormalized, cancellationToken);
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(occurrence));
        }
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
    /// DateTime overload for callers that do not preserve
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
            // failure must not cause the polling service to retry the business operation and
            // create a second occurrence notification.
            _logger.LogWarning(
                exception,
                "Notification sync push failed for user {UserId}; the persisted notification remains authoritative.",
                userId);
        }
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
