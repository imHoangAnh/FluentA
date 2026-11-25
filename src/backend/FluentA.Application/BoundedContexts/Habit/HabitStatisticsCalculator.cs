using System.Globalization;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.BoundedContexts.Habit;

internal static class HabitStatisticsCalculator
{
    private const string DateFormat = "yyyy-MM-dd";
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
            FormatDate(habit.StartDate),
            habit.GoalDays,
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

        var scheduledDays = habit.ScheduledCustomDays.ToHashSet();
        bool IsScheduled(DateTime date) => habit.Frequency == HabitFrequency.Daily || scheduledDays.Contains(date.DayOfWeek);
        var dates = completedDates.Where(date => date >= habit.StartDate && date <= asOfDate && IsScheduled(date))
            .OrderBy(date => date);
        var longest = 0;
        var current = 0;
        DateTime? previous = null;
        foreach (var date in dates)
        {
            // A weekly schedule repeats within seven days. Inspect only the gap
            // between check-ins, never every day since the habit started.
            var consecutive = previous.HasValue && (date - previous.Value).Days <= 7;
            if (consecutive)
            {
                for (var cursor = previous.GetValueOrDefault().AddDays(1); cursor < date; cursor = cursor.AddDays(1))
                {
                    if (IsScheduled(cursor))
                    {
                        consecutive = false;
                        break;
                    }
                }
            }
            current = consecutive ? current + 1 : 1;
            longest = Math.Max(longest, current);
            previous = date;
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

    public static DateTime UtcToday()
    {
        return DateTime.UtcNow.Date;
    }

    public static string FormatDate(DateTime date)
    {
        return date.ToString(DateFormat, CultureInfo.InvariantCulture);
    }
}
