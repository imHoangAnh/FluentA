namespace FluentA.Infrastructure.BackgroundJobs;

internal static class ScheduledProductivityJobKeys
{
    public static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); }
            catch (TimeZoneNotFoundException) { }
            catch (InvalidTimeZoneException) { }
        }

        throw new InvalidOperationException("The Vietnam timezone is not available on this host.");
    }

    public static string TodoReminder(Guid todoId, DateTime scheduledAtUtc) =>
        $"todo:{todoId}:reminder:{scheduledAtUtc.ToUniversalTime():yyyyMMddTHHmmssfffffffZ}";

    public static string CountdownAlert(Guid countdownId, DateTime targetDate, Guid alertId) =>
        $"countdown:{countdownId}:target:{targetDate:yyyy-MM-dd}:alert:{alertId}";
}
