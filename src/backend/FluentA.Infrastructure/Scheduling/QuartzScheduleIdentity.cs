using System.Globalization;
using Quartz;

namespace FluentA.Infrastructure.Scheduling;

public static class QuartzScheduleIdentity
{
    public const string OccurrenceGroup = "FluentA.Occurrences";
    public const string MaintenanceGroup = "FluentA.Maintenance";
    public const string InternalGroup = "FluentA.Internal";
    public const string OccurrenceJobName = "fluentA-occurrence-dispatch";
    public const string MaintenanceJobName = "fluentA-maintenance-dispatch";
    public const string ReconciliationJobName = "fluentA-reconciliation";
    public const string ReconciliationTriggerName = "fluentA-reconciliation-trigger";

    public static JobKey OccurrenceJobKey => new(OccurrenceJobName, InternalGroup);

    public static JobKey MaintenanceJobKey => new(MaintenanceJobName, InternalGroup);

    public static TriggerKey OccurrenceTriggerKey(ScheduledOccurrence occurrence) =>
        new(OccurrenceTriggerName(occurrence), OccurrenceGroup);

    public static TriggerKey MaintenanceTriggerKey(ScheduledMaintenanceKind kind) =>
        new($"maintenance-{kind.ToString().ToLowerInvariant()}", MaintenanceGroup);

    public static string OccurrenceTriggerName(ScheduledOccurrence occurrence)
    {
        var kind = occurrence.Kind.ToString().ToLowerInvariant();
        return $"{kind}:{occurrence.SourceId:N}:{occurrence.OccurrenceDateUtc:yyyyMMdd}:{occurrence.ScheduledAtUtcNormalized.Ticks.ToString(CultureInfo.InvariantCulture)}:{occurrence.RevisionToken}";
    }
}
