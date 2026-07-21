using FluentA.Domain.BoundedContexts.Todo.Enums;
using FluentA.Domain.BoundedContexts.Todo.Services;

namespace FluentA.Domain.UnitTests;

public sealed class TodoRepeatScheduleTests
{
    public static TheoryData<string, TodoRepeatPattern, string> NextDateCases => new()
    {
        { "2026-07-20", TodoRepeatPattern.Daily, "2026-07-21" },
        { "2026-07-24", TodoRepeatPattern.Weekdays, "2026-07-27" },
        { "2026-07-25", TodoRepeatPattern.Weekdays, "2026-07-27" },
        { "2026-07-26", TodoRepeatPattern.Weekdays, "2026-07-27" },
        { "2026-07-20", TodoRepeatPattern.Weekly, "2026-07-27" },
        { "2026-01-31", TodoRepeatPattern.Monthly, "2026-02-28" },
        { "2024-01-31", TodoRepeatPattern.Monthly, "2024-02-29" },
        { "2026-03-31", TodoRepeatPattern.Monthly, "2026-04-30" },
        { "2024-02-29", TodoRepeatPattern.Yearly, "2025-02-28" },
        { "2023-02-28", TodoRepeatPattern.Yearly, "2024-02-28" }
    };

    [Theory]
    [MemberData(nameof(NextDateCases))]
    public void NextDate_UsesApprovedCalendarRule(string current, TodoRepeatPattern pattern, string expected)
    {
        var actual = TodoRepeatSchedule.NextDate(DateTime.Parse(current), pattern);

        Assert.Equal(DateTime.Parse(expected).Date, actual.Date);
        Assert.Equal(DateTimeKind.Utc, actual.Kind);
    }
}
