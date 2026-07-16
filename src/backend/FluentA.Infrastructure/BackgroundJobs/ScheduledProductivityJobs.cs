using FluentA.Application.BackgroundJobs;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Entities;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledProductivityJobs : IScheduledProductivityJobs
{
    private readonly ILogger<ScheduledProductivityJobs> _logger;
    private readonly AppDbContext _dbContext;
    private readonly IAssetService _assetService;
    private readonly IAssetObjectStorage _assetStorage;

    public ScheduledProductivityJobs(AppDbContext dbContext, ILogger<ScheduledProductivityJobs> logger, IAssetService assetService, IAssetObjectStorage assetStorage)
    {
        _dbContext = dbContext;
        _logger = logger;
        _assetService = assetService;
        _assetStorage = assetStorage;
    }

    public async Task CarryOverTodosAsync(CancellationToken cancellationToken = default)
    {
        await Task.CompletedTask;
        _logger.LogInformation("TodoCarryOverJob skipped because carry-over is no longer part of the current Todo contract.");
    }

    public async Task SendHabitRemindersAsync(CancellationToken cancellationToken = default)
    {
        var today = DateTime.UtcNow.Date;
        var completedHabitIds = _dbContext.HabitEntries
            .Where(entry => entry.DeletedAt == null && entry.Date == today)
            .Select(entry => entry.HabitId);
        var habits = await _dbContext.Habits
            .Where(habit => habit.DeletedAt == null
                && habit.ReminderEnabled
                && habit.LastReminderSentOn != today
                && !completedHabitIds.Contains(habit.Id))
            .ToListAsync(cancellationToken);

        foreach (var habit in habits.Where(habit => habit.IsScheduledOn(today)))
        {
            _dbContext.Notifications.Add(Notification.Create(habit.UserId, "HabitReminder", "Habit reminder",
                $"You have not checked off {habit.Name} today.", $"habit:{habit.Id}:{today:yyyy-MM-dd}"));
            habit.MarkReminderSent(today);
            _logger.LogInformation(
                "HabitReminder notification queued for user {UserId}, habit {HabitId}, date {Date}.",
                habit.UserId, habit.Id, today);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("HabitReminderJob queued {Count} reminders.", habits.Count(habit => habit.LastReminderSentOn == today));
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

    public async Task DrainLegacyAssetDeletionQueueAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        await _assetStorage.EnsurePrivateBucketAsync(cancellationToken);

        var candidates = await _dbContext.LegacyAssetDeletionQueue
            .Where(item => item.Status == "pending")
            .OrderBy(item => item.CreatedAt)
            .Select(item => item.ObjectKey)
            .Take(100)
            .ToListAsync(cancellationToken);

        var claimed = new List<string>();
        foreach (var objectKey in candidates)
        {
            var updated = await _dbContext.LegacyAssetDeletionQueue
                .Where(item => item.ObjectKey == objectKey && item.Status == "pending")
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.Status, "claimed")
                    .SetProperty(item => item.ClaimedAt, now)
                    .SetProperty(item => item.AttemptCount, item => item.AttemptCount + 1)
                    .SetProperty(item => item.UpdatedAt, now), cancellationToken);
            if (updated == 1)
            {
                claimed.Add(objectKey);
            }
        }

        var deleted = 0;
        var failed = 0;
        foreach (var objectKey in claimed)
        {
            try
            {
                await _assetStorage.DeleteIfExistsAsync(objectKey, cancellationToken);
                await _dbContext.LegacyAssetDeletionQueue
                    .Where(item => item.ObjectKey == objectKey && item.Status == "claimed")
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(item => item.Status, "deleted")
                        .SetProperty(item => item.DeletedAt, DateTime.UtcNow)
                        .SetProperty(item => item.LastError, (string?)null)
                        .SetProperty(item => item.UpdatedAt, DateTime.UtcNow), cancellationToken);
                deleted++;
            }
            catch (AssetStorageUnavailableException exception)
            {
                await _dbContext.LegacyAssetDeletionQueue
                    .Where(item => item.ObjectKey == objectKey && item.Status == "claimed")
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(item => item.Status, "pending")
                        .SetProperty(item => item.LastError, exception.Message)
                        .SetProperty(item => item.UpdatedAt, DateTime.UtcNow), cancellationToken);
                failed++;
            }
        }

        _logger.LogInformation("LegacyAssetDeletionQueueJob claimed {Claimed} objects, deleted {Deleted}, failed {Failed}.", claimed.Count, deleted, failed);
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
}
