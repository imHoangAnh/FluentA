using System.Globalization;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Entities;

namespace FluentA.Domain.BoundedContexts.Countdown.Services;

public static class CountdownSchedule
{
    public static DateTime NextTargetDate(
        DateTime currentTargetDate,
        CountdownRepeatPattern repeatPattern,
        DateTime vietnamToday)
    {
        var current = DateTime.SpecifyKind(currentTargetDate.Date, DateTimeKind.Utc);
        var today = vietnamToday.Date;
        if (repeatPattern == CountdownRepeatPattern.None || current >= today)
        {
            return current;
        }

        return repeatPattern switch
        {
            CountdownRepeatPattern.Weekly => NextWeekly(current, today),
            CountdownRepeatPattern.Monthly => NextMonthly(current, today),
            CountdownRepeatPattern.Yearly => NextYearly(current, today),
            _ => throw new ArgumentOutOfRangeException(nameof(repeatPattern)),
        };
    }

    public static DateTime BuildAlertScheduledAtUtc(DateTime targetDate, string alertDay, string alertTime)
    {
        if (!TimeOnly.TryParseExact(alertTime, "HH:mm", CultureInfo.InvariantCulture, DateTimeStyles.None, out var localTime))
        {
            throw new ArgumentException("Countdown alert time must be HH:mm.", nameof(alertTime));
        }

        var localDate = alertDay switch
        {
            "OnTargetDay" => targetDate.Date,
            "1DayBefore" => targetDate.Date.AddDays(-1),
            "3DaysBefore" => targetDate.Date.AddDays(-3),
            "7DaysBefore" => targetDate.Date.AddDays(-7),
            _ => throw new ArgumentException("Countdown alert day is invalid.", nameof(alertDay)),
        };

        var unspecificLocal = DateTime.SpecifyKind(localDate.Add(localTime.ToTimeSpan()), DateTimeKind.Unspecified);
        return TimeZoneInfo.ConvertTimeToUtc(unspecificLocal, CountdownTimeZone.Vietnam());
    }

    private static DateTime NextWeekly(DateTime current, DateTime today)
    {
        var candidate = current;
        while (candidate <= today)
        {
            candidate = candidate.AddDays(7);
        }

        return candidate;
    }

    private static DateTime NextMonthly(DateTime current, DateTime today)
    {
        var year = current.Year;
        var month = current.Month;
        while (true)
        {
            month++;
            if (month > 12)
            {
                month = 1;
                year++;
            }

            if (DateTime.DaysInMonth(year, month) < current.Day)
            {
                continue;
            }

            var candidate = new DateTime(year, month, current.Day, 0, 0, 0, DateTimeKind.Utc);
            if (candidate > today)
            {
                return candidate;
            }
        }
    }

    private static DateTime NextYearly(DateTime current, DateTime today)
    {
        var year = current.Year;
        while (true)
        {
            year++;
            if (DateTime.DaysInMonth(year, current.Month) < current.Day)
            {
                continue;
            }

            var candidate = new DateTime(year, current.Month, current.Day, 0, 0, 0, DateTimeKind.Utc);
            if (candidate > today)
            {
                return candidate;
            }
        }
    }
}
