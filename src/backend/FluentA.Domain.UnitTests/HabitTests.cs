using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Habit.Enums;

namespace FluentA.Domain.UnitTests;

public sealed class HabitTests
{
    [Fact]
    public void SoftDelete_PreservesTrackingDetailsAndOriginalDeletionTime()
    {
        var habit = Habit.Create(Guid.NewGuid(), "Read", null, HabitIcon.Book, HabitFrequency.Daily, null, goalDays: 21);
        var deletedAt = new DateTime(2026, 10, 8, 10, 0, 0, DateTimeKind.Utc);
        habit.SoftDelete(deletedAt);
        habit.SoftDelete(deletedAt.AddMinutes(1));

        Assert.Equal(deletedAt, habit.DeletedAt);
        Assert.Equal(deletedAt, habit.UpdatedAt);
        Assert.Equal(21, habit.GoalDays);
        Assert.Equal("Read", habit.Name);
        Assert.Equal(HabitFrequency.Daily, habit.Frequency);
    }
    [Fact]
    public void Create_DailyHabit_CleansFieldsAndSchedulesEveryDay()
    {
        var habit = Habit.Create(Guid.NewGuid(), " Read English ", " 30 minutes ", HabitIcon.Book, HabitFrequency.Daily, null);

        Assert.Equal("Read English", habit.Name);
        Assert.Equal("30 minutes", habit.Description);
        Assert.Equal(HabitIcon.Book, habit.Icon);
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
            HabitIcon.Exercise,
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
            Habit.Create(Guid.NewGuid(), "Workout", null, HabitIcon.Exercise, HabitFrequency.Custom, []));
    }

    [Fact]
    public void Create_DefaultIcon_IsPersistedAsSemanticValue()
    {
        var habit = Habit.Create(Guid.NewGuid(), "Workout", null, HabitIcon.Default, HabitFrequency.Daily, null);

        Assert.Equal(HabitIcon.Default, habit.Icon);
    }

    [Fact]
    public void Create_WithStartAndGoal_PersistsDateOnlyInvariants()
    {
        var habit = Habit.Create(
            Guid.NewGuid(),
            "Read",
            null,
            HabitIcon.Book,
            HabitFrequency.Daily,
            null,
            new DateTime(2026, 7, 21, 18, 30, 0, DateTimeKind.Local),
            21);

        Assert.Equal(new DateTime(2026, 7, 21, 0, 0, 0, DateTimeKind.Utc), habit.StartDate);
        Assert.Equal(21, habit.GoalDays);
        Assert.False(habit.IsEligibleOn(new DateTime(2026, 7, 20)));
        Assert.True(habit.IsEligibleOn(new DateTime(2026, 7, 21)));
    }

    [Fact]
    public void Update_RejectsLockedStartDateAndNonIncreasingChangedGoal()
    {
        var habit = Habit.Create(
            Guid.NewGuid(),
            "Read",
            null,
            HabitIcon.Book,
            HabitFrequency.Daily,
            null,
            new DateTime(2026, 7, 21),
            21);

        Assert.Throws<InvalidOperationException>(() => habit.Update(
            habit.Name,
            habit.Description,
            habit.Icon,
            habit.Frequency,
            habit.ScheduledCustomDays,
            new DateTime(2026, 7, 22),
            habit.GoalDays,
            entryCount: 1));

        Assert.Throws<ArgumentException>(() => habit.Update(
            habit.Name,
            habit.Description,
            habit.Icon,
            habit.Frequency,
            habit.ScheduledCustomDays,
            habit.StartDate,
            goalDays: 1,
            entryCount: 1));
    }
}
