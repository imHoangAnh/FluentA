using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

internal static class HabitStatisticsCalculator
{
    private const string DateFormat = "yyyy-MM-dd";
    private const string TimeFormat = "HH:mm";
    public static HabitDto ToDto(
        HabitEntity habit,
        DateTime localToday,
        HashSet<DateTime> completedDates,
        DateTime monthStart,
        DateTime monthEnd)
    {
        var totalCheckIns = completedDates.Count;
        var goalCompletedOn = GoalCompletedOn(habit, completedDates);
        var isGoalCompleted = goalCompletedOn.HasValue;
        var streakAsOf = goalCompletedOn.HasValue && goalCompletedOn.Value < localToday
            ? goalCompletedOn.Value
            : localToday;
        var expectedDays = EachDate(monthStart, monthEnd).Count(date => IsSummaryEligible(habit, date, goalCompletedOn));
        var completedExpectedDays = completedDates.Count(date =>
            date >= monthStart
            && date <= monthEnd
            && IsSummaryEligible(habit, date, goalCompletedOn));
        var completionRate = expectedDays == 0
            ? 0
            : Math.Round((double)completedExpectedDays / expectedDays * 100, 2);

        return new HabitDto(
            habit.Id,
            habit.Name,
            habit.Description,
            habit.Icon.ToString(),
            habit.Frequency.ToString(),
            habit.ScheduledCustomDays.Select(day => day.ToString()).ToList(),
            habit.ReminderEnabled,
            FormatDate(habit.StartDate),
            habit.GoalDays,
            habit.ReminderTime.ToString(TimeFormat, CultureInfo.InvariantCulture),
            CurrentStreak(habit, completedDates, streakAsOf),
            LongestStreak(habit, completedDates, streakAsOf),
            totalCheckIns,
            IsSummaryEligible(habit, localToday, goalCompletedOn),
            completedDates.Contains(localToday),
            completionRate,
            isGoalCompleted,
            goalCompletedOn.HasValue ? FormatDate(goalCompletedOn.Value) : null,
            habit.GoalDays.HasValue ? Math.Max(0, habit.GoalDays.Value - totalCheckIns) : null,
            totalCheckIns == 0,
            habit.CreatedAt,
            habit.UpdatedAt);
    }

    private static DateTime? GoalCompletedOn(HabitEntity habit, HashSet<DateTime> completedDates)
    {
        if (!habit.GoalDays.HasValue || completedDates.Count < habit.GoalDays.Value)
        {
            return null;
        }

        return completedDates.OrderBy(date => date).ElementAt(habit.GoalDays.Value - 1);
    }

    private static bool IsSummaryEligible(HabitEntity habit, DateTime date, DateTime? goalCompletedOn)
    {
        return habit.IsEligibleOn(date) && (!goalCompletedOn.HasValue || date <= goalCompletedOn.Value);
    }

    private static int CurrentStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime asOfDate)
    {
        if (asOfDate < habit.StartDate)
        {
            return 0;
        }

        var cursor = habit.IsScheduledOn(asOfDate) && completedDates.Contains(asOfDate)
            ? asOfDate
            : asOfDate.AddDays(-1);
        var streak = 0;
        while (cursor >= habit.StartDate)
        {
            if (!habit.IsScheduledOn(cursor))
            {
                cursor = cursor.AddDays(-1);
                continue;
            }

            if (!completedDates.Contains(cursor))
            {
                break;
            }

            streak++;
            cursor = cursor.AddDays(-1);
        }

        return streak;
    }

    private static int LongestStreak(HabitEntity habit, HashSet<DateTime> completedDates, DateTime asOfDate)
    {
        if (completedDates.Count == 0 || asOfDate < habit.StartDate)
        {
            return 0;
        }

        var longest = 0;
        var current = 0;
        foreach (var date in EachDate(habit.StartDate, asOfDate))
        {
            if (!habit.IsScheduledOn(date))
            {
                continue;
            }

            if (completedDates.Contains(date))
            {
                current++;
                longest = Math.Max(longest, current);
            }
            else
            {
                current = 0;
            }
        }

        return longest;
    }

    private static IEnumerable<DateTime> EachDate(DateTime start, DateTime end)
    {
        for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
        {
            yield return date;
        }
    }

    public static DateTime LocalToday(TimeZoneInfo timeZone)
    {
        return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, timeZone).Date;
    }

    public static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }
}
