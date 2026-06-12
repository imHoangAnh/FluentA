namespace FluentA.Application.BackgroundJobs;

public interface IScheduledProductivityJobs
{
    Task CarryOverTodosAsync(CancellationToken cancellationToken = default);
    Task SendHabitRemindersAsync(CancellationToken cancellationToken = default);
    Task ProcessCountdownAlertsAsync(CancellationToken cancellationToken = default);
    Task CleanupDeletedRecordsAsync(CancellationToken cancellationToken = default);
}
