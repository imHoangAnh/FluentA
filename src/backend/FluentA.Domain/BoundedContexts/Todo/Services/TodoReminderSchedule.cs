namespace FluentA.Domain.BoundedContexts.Todo.Services;

public static class TodoReminderSchedule
{
    private const int MaximumTransitionMinutes = 180;

    public static DateTime ResolveUtc(DateTime date, TimeOnly time, TimeZoneInfo timeZone)
    {
        ArgumentNullException.ThrowIfNull(timeZone);

        var local = DateTime.SpecifyKind(date.Date.Add(time.ToTimeSpan()), DateTimeKind.Unspecified);
        if (timeZone.IsInvalidTime(local))
        {
            local = ShiftForwardByTransitionGap(local, timeZone);
        }

        if (timeZone.IsAmbiguousTime(local))
        {
            var earlierOffset = timeZone.GetAmbiguousTimeOffsets(local).Max();
            return new DateTimeOffset(local, earlierOffset).UtcDateTime;
        }

        return TimeZoneInfo.ConvertTimeToUtc(local, timeZone);
    }

    public static bool Matches(DateTime date, TimeOnly time, DateTime scheduledAtUtc, TimeZoneInfo timeZone)
    {
        ArgumentNullException.ThrowIfNull(timeZone);
        if (scheduledAtUtc.Kind != DateTimeKind.Utc)
        {
            return false;
        }

        var local = TimeZoneInfo.ConvertTimeFromUtc(scheduledAtUtc, timeZone);
        return local.Date == date.Date && TimeOnly.FromDateTime(local) == time;
    }

    private static DateTime ShiftForwardByTransitionGap(DateTime invalidLocal, TimeZoneInfo timeZone)
    {
        var before = invalidLocal;
        var after = invalidLocal;

        for (var minute = 1; minute <= MaximumTransitionMinutes; minute++)
        {
            before = invalidLocal.AddMinutes(-minute);
            if (!timeZone.IsInvalidTime(before))
            {
                break;
            }
        }

        for (var minute = 1; minute <= MaximumTransitionMinutes; minute++)
        {
            after = invalidLocal.AddMinutes(minute);
            if (!timeZone.IsInvalidTime(after))
            {
                break;
            }
        }

        if (timeZone.IsInvalidTime(before) || timeZone.IsInvalidTime(after))
        {
            throw new InvalidOperationException("The timezone transition could not be resolved.");
        }

        var transitionGap = timeZone.GetUtcOffset(after) - timeZone.GetUtcOffset(before);
        if (transitionGap <= TimeSpan.Zero)
        {
            throw new InvalidOperationException("The invalid local time does not have a forward timezone gap.");
        }

        return invalidLocal.Add(transitionGap);
    }
}
