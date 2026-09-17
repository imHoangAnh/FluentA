using FluentA.Application.BackgroundJobs;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledProductivityJobs(
    AppDbContext dbContext,
    ILogger<ScheduledProductivityJobs> logger,
    ScheduledMaintenanceJobs maintenanceJobs) : IScheduledProductivityJobs, IScheduledMaintenanceExecutor
{
    public Task ExecuteAsync(ScheduledMaintenance maintenance, CancellationToken cancellationToken = default)
        => maintenance.Kind switch
        {
            ScheduledMaintenanceKind.CountdownRecurrence => AdvanceCountdownRecurrencesAsync(cancellationToken),
            ScheduledMaintenanceKind.PendingAssetCleanup => CleanupExpiredPendingAssetsAsync(cancellationToken),
            ScheduledMaintenanceKind.ArchivedAssetPurge => PurgeExpiredArchivedAssetsAsync(cancellationToken),
            ScheduledMaintenanceKind.TrashPurge => PurgeExpiredTrashAsync(cancellationToken),
            ScheduledMaintenanceKind.DatabaseCleanup => CleanupDeletedRecordsAsync(cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(maintenance))
        };

    public async Task AdvanceCountdownRecurrencesAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var today = DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(now,
            ScheduledProductivityJobKeys.ResolveVietnamTimeZone()).Date, DateTimeKind.Utc);
        var ids = await dbContext.CountdownEvents.AsNoTracking()
            .Where(item => item.DeletedAt == null && item.RepeatPattern != CountdownRepeatPattern.None
                && item.TargetDate < today)
            .Select(item => item.Id).ToListAsync(cancellationToken);
        var advanced = 0;
        foreach (var id in ids)
        {
            await using var transaction = await dbContext.Database.BeginTransactionAsync(cancellationToken);
            // Use the same parent lock as reminder execution before changing its alerts.
            var countdown = await dbContext.CountdownEvents
                .FromSqlInterpolated($"SELECT * FROM countdowns WHERE id = {id} FOR UPDATE")
                .SingleOrDefaultAsync(cancellationToken);
            if (countdown is not null && countdown.DeletedAt is null)
            {
                await dbContext.Entry(countdown).Collection(item => item.Alerts).LoadAsync(cancellationToken);
                if (countdown.AdvanceRecurrenceAt(now))
                {
                    foreach (var alert in countdown.Alerts.Where(alert => alert.DeletedAt is null))
                    {
                        var key = ScheduledProductivityJobKeys.CountdownAlert(countdown.Id, countdown.TargetDate, alert.Id);
                        var deliveredAt = await dbContext.Notifications.AsNoTracking()
                            .Where(notification => notification.UserId == countdown.UserId && notification.DeduplicationKey == key)
                            .Select(notification => (DateTime?)notification.CreatedAt)
                            .SingleOrDefaultAsync(cancellationToken);
                        if (deliveredAt.HasValue) alert.MarkFired(deliveredAt.Value);
                    }
                    advanced++;
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
            }
            await transaction.CommitAsync(cancellationToken);
            dbContext.ChangeTracker.Clear();
        }
        logger.LogInformation("Countdown recurrence advanced {Count} occurrences for Vietnam date {Date}.", advanced, today);
    }

    public Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default)
        => maintenanceJobs.CleanupExpiredPendingAssetsAsync(cancellationToken);

    public Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default)
        => maintenanceJobs.PurgeExpiredArchivedAssetsAsync(cancellationToken);

    public Task PurgeExpiredTrashAsync(CancellationToken cancellationToken = default)
        => maintenanceJobs.PurgeExpiredTrashAsync(cancellationToken);

    public async Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);
        // Trash-owned records remain exclusively managed by TrashService.
        var deleted = await dbContext.PomodoroSessions.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        deleted += await dbContext.PomodoroConfigs.Where(entity => entity.DeletedAt < cutoff).ExecuteDeleteAsync(cancellationToken);
        logger.LogInformation("Database cleanup deleted {Count} product records older than {Cutoff}.", deleted, cutoff);
    }
}
