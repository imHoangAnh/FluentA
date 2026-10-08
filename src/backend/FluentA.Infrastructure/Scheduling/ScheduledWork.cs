namespace FluentA.Infrastructure.Scheduling;

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
/// Business-owned maintenance execution boundary.
/// </summary>
public interface IScheduledMaintenanceExecutor
{
    Task ExecuteAsync(ScheduledMaintenance maintenance, CancellationToken cancellationToken = default);
}
