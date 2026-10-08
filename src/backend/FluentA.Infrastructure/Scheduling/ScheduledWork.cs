using System.Globalization;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>
/// A single business occurrence that the polling service may dispatch.
/// </summary>
/// <remarks>
/// The business database is authoritative. The revision and occurrence values
/// The execution adapter rechecks the current business tuple before sending
/// anything. Revision is retained for compatibility with existing callers.
/// </remarks>
public sealed record ScheduledOccurrence(
    ScheduledOccurrenceKind Kind,
    Guid SourceId,
    DateTime OccurrenceDate,
    DateTime ScheduledAtUtc,
    long Revision)
{
    public DateTime OccurrenceDateUtc => DateTime.SpecifyKind(OccurrenceDate.Date, DateTimeKind.Utc);

    public DateTime ScheduledAtUtcNormalized => DateTime.SpecifyKind(ScheduledAtUtc, DateTimeKind.Utc);

    public string RevisionToken => Revision.ToString(CultureInfo.InvariantCulture);
}

public enum ScheduledOccurrenceKind
{
    TodoReminder = 1,
    HabitReminder = 3,
}

/// <summary>
/// A recurring operational task. These preserve the established maintenance
/// cadence when delivery is driven by a polling service.
/// </summary>
public sealed record ScheduledMaintenance(
    ScheduledMaintenanceKind Kind,
    DateTime ScheduledAtUtc);

public enum ScheduledMaintenanceKind
{
    PendingAssetCleanup = 2,
    ArchivedAssetPurge = 3,
    TrashPurge = 4,
    DatabaseCleanup = 5,
}

/// <summary>
/// Business-owned occurrence execution boundary. Implementations must reload
/// the source row and recheck the current schedule, eligibility and duplicate
/// notification state before writing anything. A stale trigger is safe because
/// execution is idempotent and the current business tuple remains authoritative.
/// </summary>
public interface IScheduledOccurrenceExecutor
{
    Task ExecuteAsync(ScheduledOccurrence occurrence, CancellationToken cancellationToken = default);
}

/// <summary>
/// Business-owned maintenance execution boundary.
/// </summary>
public interface IScheduledMaintenanceExecutor
{
    Task ExecuteAsync(ScheduledMaintenance maintenance, CancellationToken cancellationToken = default);
}
