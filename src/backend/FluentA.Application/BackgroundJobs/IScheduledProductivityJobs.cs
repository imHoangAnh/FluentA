namespace FluentA.Application.BackgroundJobs;

public interface IScheduledProductivityJobs
{
    Task CarryOverTodosAsync(CancellationToken cancellationToken = default);
    Task ProcessTodoRemindersAsync(CancellationToken cancellationToken = default);
    Task SendHabitRemindersAsync(CancellationToken cancellationToken = default);
    Task ProcessCountdownAlertsAsync(CancellationToken cancellationToken = default);
    Task CleanupRetiredCountdownsAsync(CancellationToken cancellationToken = default);
    Task CleanupExpiredPendingAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredArchivedAssetsAsync(CancellationToken cancellationToken = default);
    Task PurgeExpiredTrashAsync(CancellationToken cancellationToken = default);
    Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default);
}
