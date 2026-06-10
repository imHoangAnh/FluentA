namespace FluentA.Application.BoundedContexts.Flashcards;

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
        var localReviewDate = TimeZoneInfo.ConvertTimeFromUtc(
            DateTime.SpecifyKind(reviewedAtUtc, DateTimeKind.Utc),
            timeZone).Date;
        var localTarget = DateTime.SpecifyKind(localReviewDate.AddDays(intervalDays), DateTimeKind.Unspecified);

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
