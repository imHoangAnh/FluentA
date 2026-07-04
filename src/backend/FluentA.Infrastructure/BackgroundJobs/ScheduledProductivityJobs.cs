using FluentA.Application.BackgroundJobs;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using FluentA.Domain.BoundedContexts.Notification.Entities;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledProductivityJobs : IScheduledProductivityJobs
{
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
        var today = DateTime.UtcNow.Date;
        var items = await _dbContext.TodoItems
            .Where(item => item.DeletedAt == null && !item.IsCompleted && item.Date < today)
            .ToListAsync(cancellationToken);

        var changed = items.Count(item => item.CarryOver(today));
        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("TodoCarryOverJob carried over {Count} tasks to {Date}.", changed, today);
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
        var countdowns = await _dbContext.CountdownEvents
            .Where(countdown => countdown.DeletedAt == null
                && countdown.AlertedAt == null
                && countdown.TargetDate <= now)
            .ToListAsync(cancellationToken);

        foreach (var countdown in countdowns)
        {
            _dbContext.Notifications.Add(Notification.Create(countdown.UserId, "CountdownAlert", "Countdown complete",
                $"{countdown.Name} has reached its target time.", $"countdown:{countdown.Id}"));
            countdown.MarkAlerted(now);
            _logger.LogInformation(
                "CountdownAlert notification queued for user {UserId}, countdown {CountdownId}.",
                countdown.UserId, countdown.Id);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("CountdownAlertJob marked {Count} countdowns complete.", countdowns.Count);
    }

    public async Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default)
    {
        var cleaned = await _assetService.CleanupExpiredPendingAsync(cancellationToken);
        _logger.LogInformation("PendingAssetCleanupJob retired {Count} expired pending assets.", cleaned);
    }

    public async Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        var deleted = 0;

        deleted += await _dbContext.HabitEntries.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.Habits.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await _dbContext.TodoItems.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
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
