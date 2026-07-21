using FluentA.Application.BackgroundJobs;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FluentA.Domain.BoundedContexts.Notification.Entities;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledProductivityJobs : IScheduledProductivityJobs
{
    private static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();
    private readonly ILogger<ScheduledProductivityJobs> _logger;
    private readonly AppDbContext _dbContext;
    private readonly IAssetService _assetService;

    public ScheduledProductivityJobs(AppDbContext dbContext, ILogger<ScheduledProductivityJobs> logger, IAssetService assetService)
    {
        _dbContext = dbContext;
        _logger = logger;
        _assetService = assetService;
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
            item => TodoReminderDeduplicationKey(item.Id, item.ReminderScheduledAtUtc!.Value));
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
                _dbContext.Notifications.Add(Notification.Create(
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
            _dbContext.Notifications.Add(Notification.Create(habit.UserId, "HabitReminder", "Habit reminder",
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

        foreach (var alert in alerts)
        {
            if (!countdowns.TryGetValue(alert.CountdownId, out var countdown))
            {
                continue;
            }

            _dbContext.Notifications.Add(Notification.Create(countdown.UserId, "CountdownAlert", "Countdown reminder",
                $"{countdown.Name} - {alert.AlertDay} at {alert.AlertTime}.", $"countdown:{countdown.Id}:alert:{alert.Id}"));
            alert.MarkFired(now);
            _logger.LogInformation(
                "CountdownAlert notification queued for user {UserId}, countdown {CountdownId}, alert {AlertId}.",
                countdown.UserId, countdown.Id, alert.Id);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("CountdownAlertJob fired {Count} countdown alerts.", alerts.Count);
    }

    public async Task CleanupRetiredCountdownsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var countdowns = await _dbContext.CountdownEvents
            .Include(countdown => countdown.Alerts)
            .Where(countdown => countdown.DeletedAt == null)
            .ToListAsync(cancellationToken);

        var retired = 0;
        foreach (var countdown in countdowns.Where(countdown => countdown.ShouldRetireAt(now)))
        {
            if (countdown.CoverAssetId.HasValue)
            {
                var asset = await _dbContext.Assets.FirstOrDefaultAsync(
                    entity => entity.Id == countdown.CoverAssetId.Value
                        && entity.UploadedByUserId == countdown.UserId
                        && entity.DeletedAt == null,
                    cancellationToken);

                if (asset is not null)
                {
                    asset.Archive(now, TimeSpan.FromDays(30));
                }
            }

            countdown.DetachCover();
            countdown.SoftDelete(now);

            retired++;
            _logger.LogInformation("Countdown retirement queued for user {UserId}, countdown {CountdownId}.", countdown.UserId, countdown.Id);
        }

        if (retired > 0)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        _logger.LogInformation("CountdownRetirementJob retired {Count} countdowns.", retired);
    }

    public async Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default)
    {
        var cleaned = await _assetService.CleanupExpiredPendingAsync(cancellationToken);
        _logger.LogInformation("PendingAssetCleanupJob retired {Count} expired pending assets.", cleaned);
    }

    public async Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default)
    {
        var result = await _assetService.PurgeExpiredArchivedAsync(cancellationToken);
        _logger.LogInformation("ArchivedAssetPurgeJob claimed {Claimed} assets, deleted {Deleted}, failed {Failed}.", result.Claimed, result.Deleted, result.Failed);
    }

    public async Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var deleted = 0;

        deleted += await _dbContext.HabitEntries.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.Habits.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.TodoItems.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.CountdownAlerts.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.CountdownEvents.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.JournalEntries.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.KanbanCards.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.KanbanColumns.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.KanbanBoards.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.PomodoroSessions.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.PomodoroConfigs.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);

        _logger.LogInformation("DatabaseCleanupJob permanently deleted {Count} product records older than {Cutoff}.", deleted, cutoff);
    }

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        throw new InvalidOperationException("The Vietnam timezone is not available on this host.");
    }

    private static string TodoReminderDeduplicationKey(Guid todoId, DateTime scheduledAtUtc)
    {
        return $"todo:{todoId}:reminder:{scheduledAtUtc.ToUniversalTime():yyyyMMddTHHmmssfffffffZ}";
    }
}
