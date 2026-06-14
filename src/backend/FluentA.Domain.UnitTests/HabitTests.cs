using FluentA.Domain.BoundedContexts.Habit.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class HabitTests
{
    [Fact]
    public void Habit_ReminderCanBeDisabledAndReenabled()
    {
        var habit = Habit.Create(Guid.NewGuid(), "Read", null, null, null, HabitFrequency.Daily, null);

        habit.SetReminderEnabled(false);
        Assert.False(habit.ReminderEnabled);

        habit.SetReminderEnabled(true);
        Assert.True(habit.ReminderEnabled);
    }
    [Fact]
    public void Create_DailyHabit_CleansFieldsAndSchedulesEveryDay()
    {
        var habit = Habit.Create(Guid.NewGuid(), " Read English ", " 30 minutes ", "#22C55E", "book", HabitFrequency.Daily, null);

        Assert.Equal("Read English", habit.Name);
        Assert.Equal("30 minutes", habit.Description);
        Assert.Empty(habit.ScheduledCustomDays);
        Assert.True(habit.IsScheduledOn(new DateTime(2026, 6, 11)));
        Assert.True(habit.IsScheduledOn(new DateTime(2026, 6, 12)));
    }

    [Fact]
    public void Create_CustomHabit_SchedulesOnlyConfiguredDays()
    {
        var habit = Habit.Create(
            Guid.NewGuid(),
            "Workout",
            null,
            null,
            null,
            HabitFrequency.Custom,
            [DayOfWeek.Monday, DayOfWeek.Wednesday]);

        Assert.True(habit.IsScheduledOn(new DateTime(2026, 6, 8)));
        Assert.True(habit.IsScheduledOn(new DateTime(2026, 6, 10)));
        Assert.False(habit.IsScheduledOn(new DateTime(2026, 6, 11)));
    }

    [Fact]
    public void Create_CustomHabit_RequiresScheduledDay()
    {
        Assert.Throws<ArgumentException>(() =>
            Habit.Create(Guid.NewGuid(), "Workout", null, null, null, HabitFrequency.Custom, []));
    }

    [Fact]
    public void Create_RejectsInvalidColor()
    {
        Assert.Throws<ArgumentException>(() =>
            Habit.Create(Guid.NewGuid(), "Workout", null, "green", null, HabitFrequency.Daily, null));
    }
}
