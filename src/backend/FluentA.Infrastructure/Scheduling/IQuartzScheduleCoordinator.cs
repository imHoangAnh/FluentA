using Quartz;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>
/// Coordinates business-owned occurrences with the persistent Quartz store.
/// Implementations are intentionally callable after a business transaction
/// commits; the database write and the scheduler write are repaired separately.
/// </summary>
public interface IQuartzScheduleCoordinator
{
    Task ReconcileAsync(CancellationToken cancellationToken = default);

    Task UpsertOccurrenceAsync(
        ScheduledOccurrence occurrence,
        CancellationToken cancellationToken = default);

    Task UnscheduleOccurrenceAsync(
        ScheduledOccurrence occurrence,
        CancellationToken cancellationToken = default);
}
