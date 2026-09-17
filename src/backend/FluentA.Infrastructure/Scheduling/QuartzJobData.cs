using System.Globalization;
using Quartz;

namespace FluentA.Infrastructure.Scheduling;

internal static class QuartzJobData
{
    public const string Kind = "kind";
    public const string SourceId = "sourceId";
    public const string OccurrenceDateUtc = "occurrenceDateUtc";
    public const string ScheduledAtUtc = "scheduledAtUtc";
    public const string Revision = "revision";
    public const string MaintenanceKind = "maintenanceKind";

    public static JobDataMap ForOccurrence(ScheduledOccurrence occurrence)
    {
        return new JobDataMap
        {
            [Kind] = ((int)occurrence.Kind).ToString(CultureInfo.InvariantCulture),
            [SourceId] = occurrence.SourceId.ToString("D"),
            [OccurrenceDateUtc] = occurrence.OccurrenceDateUtc.ToString("O", CultureInfo.InvariantCulture),
            [ScheduledAtUtc] = occurrence.ScheduledAtUtcNormalized.ToString("O", CultureInfo.InvariantCulture),
            [Revision] = occurrence.RevisionToken,
        };
    }

    public static JobDataMap ForMaintenance(ScheduledMaintenanceKind kind)
    {
        return new JobDataMap
        {
            [MaintenanceKind] = ((int)kind).ToString(CultureInfo.InvariantCulture),
        };
    }

    public static ScheduledOccurrence ReadOccurrence(JobDataMap data)
    {
        var kindValue = ReadInt(data, Kind);
        if (!Enum.IsDefined(typeof(ScheduledOccurrenceKind), kindValue)
            || !Guid.TryParse(ReadString(data, SourceId), out var sourceId)
            || !DateTime.TryParse(ReadString(data, OccurrenceDateUtc), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var occurrenceDate)
            || !DateTime.TryParse(ReadString(data, ScheduledAtUtc), CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out var scheduledAtUtc))
        {
            throw new InvalidOperationException("Quartz occurrence trigger data is invalid.");
        }

        return new ScheduledOccurrence(
            (ScheduledOccurrenceKind)kindValue,
            sourceId,
            DateTime.SpecifyKind(occurrenceDate.Date, DateTimeKind.Utc),
            DateTime.SpecifyKind(scheduledAtUtc, DateTimeKind.Utc),
            ReadLong(data, Revision));
    }

    public static ScheduledMaintenanceKind ReadMaintenanceKind(JobDataMap data)
    {
        var value = ReadInt(data, MaintenanceKind);
        if (!Enum.IsDefined(typeof(ScheduledMaintenanceKind), value))
        {
            throw new InvalidOperationException("Quartz maintenance trigger data is invalid.");
        }

        return (ScheduledMaintenanceKind)value;
    }

    private static string ReadString(JobDataMap data, string key) =>
        data.TryGetString(key, out var value) && !string.IsNullOrWhiteSpace(value)
            ? value
            : throw new InvalidOperationException($"Quartz trigger data is missing '{key}'.");

    private static int ReadInt(JobDataMap data, string key) =>
        int.TryParse(ReadString(data, key), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : throw new InvalidOperationException($"Quartz trigger data '{key}' is not an integer.");

    private static long ReadLong(JobDataMap data, string key) =>
        long.TryParse(ReadString(data, key), NumberStyles.Integer, CultureInfo.InvariantCulture, out var value)
            ? value
            : throw new InvalidOperationException($"Quartz trigger data '{key}' is not an integer.");
}
