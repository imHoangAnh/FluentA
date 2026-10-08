using FluentA.Application.BackgroundJobs;
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
            ScheduledMaintenanceKind.PendingAssetCleanup => CleanupExpiredPendingAssetsAsync(cancellationToken),
            ScheduledMaintenanceKind.ArchivedAssetPurge => PurgeExpiredArchivedAssetsAsync(cancellationToken),
            ScheduledMaintenanceKind.TrashPurge => PurgeExpiredTrashAsync(cancellationToken),
            ScheduledMaintenanceKind.DatabaseCleanup => CleanupDeletedRecordsAsync(cancellationToken),
            _ => throw new ArgumentOutOfRangeException(nameof(maintenance))
        };

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
