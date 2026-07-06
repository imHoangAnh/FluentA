namespace FluentA.Application.BoundedContexts.Review;

public static class ReviewTime
{
    public static bool TryFindTimeZone(string? timeZoneId, out TimeZoneInfo? timeZone)
    {
        timeZone = null;
        if (string.IsNullOrWhiteSpace(timeZoneId))
        {
            return false;
        }

        try
        {
            timeZone = TimeZoneInfo.FindSystemTimeZoneById(timeZoneId.Trim());
            return true;
        }
        catch (TimeZoneNotFoundException)
        {
            return false;
        }
        catch (InvalidTimeZoneException)
        {
            return false;
        }
    }

    public static DateTime NextReviewUtc(DateTime reviewedAtUtc, int intervalDays, TimeZoneInfo timeZone)
    {
        var localReviewDate = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc), timeZone).Date;
        return LocalDateStartUtc(localReviewDate.AddDays(intervalDays), timeZone);
    }

    public static (DateTime StartUtc, DateTime EndUtc) LocalDayBoundsUtc(DateTime utcNow, TimeZoneInfo timeZone)
    {
        var localDate = TimeZoneInfo.ConvertTimeFromUtc(DateTime.SpecifyKind(utcNow, DateTimeKind.Utc), timeZone).Date;
        return LocalDateBoundsUtc(localDate, timeZone);
    }

    public static (DateTime StartUtc, DateTime EndUtc) LocalDateBoundsUtc(DateTime localDate, TimeZoneInfo timeZone)
    {
        return (LocalDateStartUtc(localDate, timeZone), LocalDateStartUtc(localDate.AddDays(1), timeZone));
    }

    private static DateTime LocalDateStartUtc(DateTime localDate, TimeZoneInfo timeZone)
    {
        var localTarget = DateTime.SpecifyKind(localDate.Date, DateTimeKind.Unspecified);

        while (timeZone.IsInvalidTime(localTarget))
        {
            localTarget = localTarget.AddMinutes(1);
        }

        if (timeZone.IsAmbiguousTime(localTarget))
        {
            var earlierOffset = timeZone.GetAmbiguousTimeOffsets(localTarget).Max();
            return new DateTimeOffset(localTarget, earlierOffset).UtcDateTime;
        }

        return TimeZoneInfo.ConvertTimeToUtc(localTarget, timeZone);
    }
}
