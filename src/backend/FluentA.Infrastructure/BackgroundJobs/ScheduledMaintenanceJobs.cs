using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Trash;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.BackgroundJobs;

public sealed class ScheduledMaintenanceJobs
{
    private readonly IAssetService _assetService;
    private readonly ITrashService _trashService;
    private readonly ILogger<ScheduledMaintenanceJobs> _logger;

    public ScheduledMaintenanceJobs(
        IAssetService assetService,
        ITrashService trashService,
        ILogger<ScheduledMaintenanceJobs> logger)
    {
        _assetService = assetService;
        _trashService = trashService;
        _logger = logger;
    }

    public async Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken)
    {
        var cleaned = await _assetService.CleanupExpiredPendingAsync(cancellationToken);
        _logger.LogInformation("PendingAssetCleanupJob retired {Count} expired pending assets.", cleaned);
    }

    public async Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken)
    {
        var result = await _assetService.PurgeExpiredArchivedAsync(cancellationToken);
        _logger.LogInformation("ArchivedAssetPurgeJob claimed {Claimed} assets, deleted {Deleted}, failed {Failed}.", result.Claimed, result.Deleted, result.Failed);
    }

    public async Task PurgeExpiredTrashAsync(CancellationToken cancellationToken)
    {
        var result = await _trashService.PurgeDueAsync(cancellationToken);
        _logger.LogInformation("TrashPurgeJob claimed {Claimed}, deleted {Deleted}, skipped {Skipped}, failed {Failed}.", result.Claimed, result.Deleted, result.Skipped, result.Failed);
    }
}
