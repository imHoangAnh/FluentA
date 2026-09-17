namespace FluentA.Application.BackgroundJobs;

public interface IScheduledProductivityJobs
{
    Task AdvanceCountdownRecurrencesAsync(CancellationToken cancellationToken = default);
    Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredTrashAsync(CancellationToken cancellationToken = default);
    Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default);
}
