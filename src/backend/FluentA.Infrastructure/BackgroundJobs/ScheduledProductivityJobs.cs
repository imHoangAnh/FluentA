using FluentA.Application.BackgroundJobs;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledProductivityJobs : IScheduledProductivityJobs
{
    private static readonly TimeZoneInfo VietnamTimeZone = ScheduledProductivityJobKeys.ResolveVietnamTimeZone();
    private readonly ILogger<ScheduledProductivityJobs> _logger;
    private readonly AppDbContext _dbContext;
    private readonly ScheduledMaintenanceJobs _maintenanceJobs;

    public ScheduledProductivityJobs(AppDbContext dbContext, ILogger<ScheduledProductivityJobs> logger, ScheduledMaintenanceJobs maintenanceJobs)
    {
        _dbContext = dbContext;
        _logger = logger;
        _maintenanceJobs = maintenanceJobs;
    }

    public async Task CarryOverTodosAsync(CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask;
        _logger.LogInformation("TodoCarryOverJob skipped because carry-over is no longer part of the current Todo contract.");
    }

    public async Task ProcessTodoRemindersAsync(CancellationToken cancellationToken = default)
    {
        var nowUtc = DateTime.UtcNow;
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var dueItems = await _dbContext.TodoItems
            .FromSqlInterpolated($"SELECT * FROM todo_items WHERE deleted_at IS NULL AND is_completed = FALSE AND reminder_scheduled_at_utc IS NOT NULL AND reminder_scheduled_at_utc <= {nowUtc} AND reminder_sent_at_utc IS NULL ORDER BY reminder_scheduled_at_utc, id LIMIT 100 FOR UPDATE SKIP LOCKED")
            .ToListAsync(cancellationToken);

        if (dueItems.Count == 0)
        {
            await transaction.CommitAsync(cancellationToken);
            _logger.LogInformation("TodoReminderJob found no due reminders at {NowUtc}.", nowUtc);
            return;
        }

        var deduplicationKeys = dueItems.ToDictionary(
            item => item.Id,
            item => ScheduledProductivityJobKeys.TodoReminder(item.Id, item.ReminderScheduledAtUtc!.Value));
        var keys = deduplicationKeys.Values.ToArray();
        var existingKeys = await _dbContext.Notifications
            .Where(notification => keys.Contains(notification.DeduplicationKey))
            .Select(notification => notification.DeduplicationKey)
            .ToHashSetAsync(cancellationToken);

        var queued = 0;
        foreach (var item in dueItems)
        {
            var deduplicationKey = deduplicationKeys[item.Id];
            if (!existingKeys.Contains(deduplicationKey))
            {
                _dbContext.Notifications.Add(NotificationEntity.Create(
                    item.UserId,
                    "TodoReminder",
                    "Todo reminder",
                    item.Title,
                    deduplicationKey,
                    $"/todo?taskId={item.Id}"));
                queued++;
            }

            item.MarkReminderSent(nowUtc);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        _logger.LogInformation(
            "TodoReminderJob claimed {ClaimedCount} due reminders and queued {QueuedCount} notifications at {NowUtc}.",
            dueItems.Count,
            queued,
            nowUtc);
    }

    public async Task SendHabitRemindersAsync(CancellationToken cancellationToken = default)
    {
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, VietnamTimeZone);
        var today = DateTime.SpecifyKind(localNow.Date, DateTimeKind.Utc);
        var localTime = TimeOnly.FromDateTime(localNow);
        var completedHabitIds = _dbContext.HabitEntries
            .Where(entry => entry.DeletedAt == null && entry.Date == today)
            .Select(entry => entry.HabitId);
        var habits = await _dbContext.Habits
            .Where(habit => habit.DeletedAt == null
                && habit.ReminderEnabled
                && habit.StartDate <= today
                && habit.ReminderTime <= localTime
                && habit.LastReminderSentOn != today
                && !completedHabitIds.Contains(habit.Id)
                && (!habit.GoalDays.HasValue
                    || _dbContext.HabitEntries.Count(entry =>
                        entry.HabitId == habit.Id && entry.DeletedAt == null) < habit.GoalDays.Value))
            .ToListAsync(cancellationToken);

        var queued = 0;
        foreach (var habit in habits.Where(habit => habit.IsEligibleOn(today)))
        {
            _dbContext.Notifications.Add(NotificationEntity.Create(habit.UserId, "HabitReminder", "Habit reminder",
                $"You have not checked off {habit.Name} today.", $"habit:{habit.Id}:{today:yyyy-MM-dd}"));
            habit.MarkReminderSent(today);
            queued++;
            _logger.LogInformation(
                "HabitReminder notification queued for user {UserId}, habit {HabitId}, date {Date}.",
                habit.UserId, habit.Id, today);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation(
            "HabitReminderJob evaluated {CandidateCount} due habits and queued {QueuedCount} reminders for Vietnam date {Date}.",
            habits.Count,
            queued,
            today);
    }

    public async Task ProcessCountdownAlertsAsync(CancellationToken cancellationToken = default)
    {
        await AdvanceCountdownRecurrencesAsync(cancellationToken);

        var now = DateTime.UtcNow;
        var alerts = await _dbContext.CountdownAlerts
            .Where(alert => alert.DeletedAt == null
                && alert.FiredAtUtc == null
                && alert.ScheduledAtUtc <= now)
            .ToListAsync(cancellationToken);

        var countdownIds = alerts.Select(alert => alert.CountdownId).Distinct().ToArray();
        var countdowns = await _dbContext.CountdownEvents
            .Where(countdown => countdown.DeletedAt == null && countdownIds.Contains(countdown.Id))
            .ToDictionaryAsync(countdown => countdown.Id, cancellationToken);

        var activeAlerts = alerts.Where(alert => countdowns.ContainsKey(alert.CountdownId)).ToList();
        var deduplicationKeys = activeAlerts.ToDictionary(
            alert => alert.Id,
            alert => ScheduledProductivityJobKeys.CountdownAlert(countdowns[alert.CountdownId].Id, countdowns[alert.CountdownId].TargetDate, alert.Id));
        var existingKeys = await _dbContext.Notifications
            .Where(notification => deduplicationKeys.Values.Contains(notification.DeduplicationKey))
            .Select(notification => notification.DeduplicationKey)
            .ToHashSetAsync(cancellationToken);

        foreach (var alert in activeAlerts)
        {
            if (!countdowns.TryGetValue(alert.CountdownId, out var countdown))
            {
                continue;
            }

            var deduplicationKey = deduplicationKeys[alert.Id];
            if (!existingKeys.Contains(deduplicationKey))
            {
                _dbContext.Notifications.Add(NotificationEntity.Create(countdown.UserId, "CountdownAlert", "Countdown reminder",
                    $"{countdown.Name} - {alert.AlertDay} at {alert.AlertTime}.", deduplicationKey));
            }

            alert.MarkFired(now);
            _logger.LogInformation(
                "CountdownAlert notification queued for user {UserId}, countdown {CountdownId}, alert {AlertId}.",
                countdown.UserId, countdown.Id, alert.Id);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("CountdownAlertJob fired {Count} countdown alerts.", alerts.Count);
    }

    public async Task AdvanceCountdownRecurrencesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var countdowns = await _dbContext.CountdownEvents
            .Where(countdown => countdown.DeletedAt == null)
            .ToListAsync(cancellationToken);

        var advanced = 0;
        foreach (var countdown in countdowns)
        {
            if (countdown.AdvanceRecurrenceAt(now))
            {
                advanced++;
                _logger.LogInformation("Countdown recurrence advanced for user {UserId}, countdown {CountdownId}, target {TargetDate}.", countdown.UserId, countdown.Id, countdown.TargetDate);
            }
        }

        if (advanced > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("CountdownRecurrenceJob advanced {Count} countdowns.", advanced);
    }

    public async Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default)
    {
        await _maintenanceJobs.CleanupExpiredPendingAssetsAsync(cancellationToken);
    }

    public async Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default)
    {
        await _maintenanceJobs.PurgeExpiredArchivedAssetsAsync(cancellationToken);
    }

    public async Task PurgeExpiredTrashAsync(CancellationToken cancellationToken = default)
    {
        await _maintenanceJobs.PurgeExpiredTrashAsync(cancellationToken);
    }

    public async Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var deleted = 0;

        // E35-owned records are permanently deleted exclusively by TrashService.
        deleted += await _dbContext.PomodoroSessions.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.PomodoroConfigs.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);

        _logger.LogInformation("DatabaseCleanupJob permanently deleted {Count} product records older than {Cutoff}.", deleted, cutoff);
    }

}
