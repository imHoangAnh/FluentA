namespace FluentA.Application.BackgroundJobs;

public interface IScheduledProductivityJobs
{
    Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredTrashAsync(CancellationToken cancellationToken = default);
    Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default);
}
