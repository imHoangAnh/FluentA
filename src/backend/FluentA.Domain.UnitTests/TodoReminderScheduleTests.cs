using FluentA.Domain.BoundedContexts.Todo.Services;
using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class TodoReminderScheduleTests
{
    private static readonly TimeZoneInfo NewYork = TimeZoneInfo.FindSystemTimeZoneById("America/New_York");

    [Fact]
    public void Matches_AcceptsTheExactBrowserResolvedInstant()
    {
        var scheduledAtUtc = new DateTime(2026, 7, 22, 13, 30, 0, DateTimeKind.Utc);

        Assert.True(TodoReminderSchedule.Matches(new DateTime(2026, 7, 22), new TimeOnly(9, 30), scheduledAtUtc, NewYork));
        Assert.False(TodoReminderSchedule.Matches(new DateTime(2026, 7, 22), new TimeOnly(9, 31), scheduledAtUtc, NewYork));
        Assert.False(TodoReminderSchedule.Matches(new DateTime(2026, 7, 23), new TimeOnly(9, 30), scheduledAtUtc, NewYork));
        Assert.False(TodoReminderSchedule.Matches(new DateTime(2026, 7, 22), new TimeOnly(9, 30), DateTime.SpecifyKind(scheduledAtUtc, DateTimeKind.Unspecified), NewYork));
    }

    [Fact]
    public void ResolveUtc_UsesTheEarlierOccurrenceForAnAmbiguousLocalTime()
    {
        var resolved = TodoReminderSchedule.ResolveUtc(new DateTime(2026, 11, 1), new TimeOnly(1, 30), NewYork);

        Assert.Equal(new DateTime(2026, 11, 1, 5, 30, 0, DateTimeKind.Utc), resolved);
        Assert.True(TodoReminderSchedule.Matches(new DateTime(2026, 11, 1), new TimeOnly(1, 30), resolved, NewYork));
    }

    [Fact]
    public void ResolveUtc_ShiftsANonexistentLocalTimeForwardByTheDstGap()
    {
        var resolved = TodoReminderSchedule.ResolveUtc(new DateTime(2026, 3, 8), new TimeOnly(2, 30), NewYork);

        Assert.Equal(new DateTime(2026, 3, 8, 7, 30, 0, DateTimeKind.Utc), resolved);
        Assert.Equal(new DateTime(2026, 3, 8, 3, 30, 0), TimeZoneInfo.ConvertTimeFromUtc(resolved, NewYork));
    }

    [Fact]
    public void TodoItem_ReminderStateCanBeSentReplacedAndCancelled()
    {
        var item = TodoItem.Create(Guid.NewGuid(), "Reminder state", new DateTime(2035, 7, 22), null);
        var firstInstant = new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Utc);
        var secondInstant = new DateTime(2035, 7, 22, 14, 30, 0, DateTimeKind.Utc);

        item.SetReminder(new TimeOnly(9, 30), "America/New_York", firstInstant);
        item.MarkReminderSent(firstInstant);
        item.SetReminder(new TimeOnly(10, 30), "America/New_York", secondInstant);
        item.CancelUnsentReminder();

        Assert.Null(item.ReminderTime);
        Assert.Null(item.ReminderTimeZoneId);
        Assert.Null(item.ReminderScheduledAtUtc);
        Assert.Null(item.ReminderSentAtUtc);
    }
}
