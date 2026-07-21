using FluentA.Domain.BoundedContexts.Todo.Enums;

namespace FluentA.Domain.BoundedContexts.Todo.Services;

public static class TodoRepeatSchedule
{
    public static DateTime NextDate(DateTime currentDate, TodoRepeatPattern pattern)
    {
        var current = DateTime.SpecifyKind(currentDate.Date, DateTimeKind.Utc);
        return pattern switch
        {
            TodoRepeatPattern.Daily => current.AddDays(1),
            TodoRepeatPattern.Weekdays => NextWeekday(current),
            TodoRepeatPattern.Weekly => current.AddDays(7),
            TodoRepeatPattern.Monthly => AddClampedMonths(current, 1),
            TodoRepeatPattern.Yearly => AddClampedYears(current, 1),
            _ => throw new ArgumentOutOfRangeException(nameof(pattern), pattern, "Unsupported Todo repeat pattern.")
        };
    }

    private static DateTime NextWeekday(DateTime current)
    {
        var candidate = current.AddDays(1);
        while (candidate.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday)
        {
            candidate = candidate.AddDays(1);
        }

        return candidate;
    }

    private static DateTime AddClampedMonths(DateTime current, int months)
    {
        var firstOfTarget = new DateTime(current.Year, current.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(months);
        var day = Math.Min(current.Day, DateTime.DaysInMonth(firstOfTarget.Year, firstOfTarget.Month));
        return new DateTime(firstOfTarget.Year, firstOfTarget.Month, day, 0, 0, 0, DateTimeKind.Utc);
    }

    private static DateTime AddClampedYears(DateTime current, int years)
    {
        var targetYear = checked(current.Year + years);
        var day = Math.Min(current.Day, DateTime.DaysInMonth(targetYear, current.Month));
        return new DateTime(targetYear, current.Month, day, 0, 0, 0, DateTimeKind.Utc);
    }
}
