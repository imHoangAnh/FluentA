using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.UnitTests;

public sealed class HabitServiceTests
{
    [Fact]
    public async Task CreateListUpdateAndDelete_UseOwnedHabits()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();

        var created = await service.CreateAsync(userId, new CreateHabitRequest(" Read ", " Daily ", "Book", "Daily"));
        var listed = await service.ListAsync(userId, "UTC");
        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateHabitRequest(Name: "Read English"));
        var deleted = await service.DeleteAsync(userId, created.Value.Id);
        var afterDelete = await service.ListAsync(userId, "UTC");

        Assert.True(created.IsSuccess);
        Assert.Equal("Read", created.Value.Name);
        Assert.Equal("Book", created.Value.Icon);
        Assert.Single(listed.Value!);
        Assert.Equal("Read English", updated.Value!.Name);
        Assert.True(deleted.Value);
        Assert.Empty(afterDelete.Value!);
    }

    [Fact]
    public async Task ToggleEntry_RejectsFutureAndUnscheduledDates()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var custom = await service.CreateAsync(
            userId,
            new CreateHabitRequest(
                "Workout",
                Frequency: "Custom",
                CustomDays: [DateTime.UtcNow.Date.DayOfWeek.ToString()]));
        var tomorrow = DateTime.UtcNow.Date.AddDays(1).ToString("yyyy-MM-dd");
        var unscheduled = NextUnscheduledDate(DateTime.UtcNow.Date, custom.Value!.CustomDays).ToString("yyyy-MM-dd");

        var future = await service.ToggleEntryAsync(userId, custom.Value.Id, new ToggleHabitEntryRequest(tomorrow, "UTC"));
        var notScheduled = await service.ToggleEntryAsync(userId, custom.Value.Id, new ToggleHabitEntryRequest(unscheduled, "UTC"));

        Assert.False(future.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((HabitError)future.Error!).Code);
        Assert.False(notScheduled.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((HabitError)notScheduled.Error!).Code);
    }

    [Fact]
    public async Task ToggleEntry_CreatesAndRemovesOneEntry()
    {
        var repository = new FakeHabitRepository();
        var notifier = new RecordingHabitSyncNotifier();
        var service = new HabitService(repository, notifier);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var habit = await service.CreateAsync(userId, new CreateHabitRequest("Read", Frequency: "Daily"));

        var checkedResult = await service.ToggleEntryAsync(userId, habit.Value!.Id, new ToggleHabitEntryRequest(today, "UTC"));
        var entriesAfterCheck = await service.ListEntriesAsync(userId, habit.Value.Id, DateTime.UtcNow.ToString("yyyy-MM"), "UTC");
        var uncheckedResult = await service.ToggleEntryAsync(userId, habit.Value.Id, new ToggleHabitEntryRequest(today, "UTC"));
        var entriesAfterUncheck = await service.ListEntriesAsync(userId, habit.Value.Id, DateTime.UtcNow.ToString("yyyy-MM"), "UTC");

        Assert.True(checkedResult.Value!.IsCompleted);
        Assert.Single(entriesAfterCheck.Value!);
        Assert.False(uncheckedResult.Value!.IsCompleted);
        Assert.Empty(entriesAfterUncheck.Value!);
        Assert.Equal(2, notifier.CheckedItems.Count);
    }

    [Fact]
    public async Task ToggleEntry_ReturnsNotFoundForForeignHabit()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var habit = await service.CreateAsync(ownerId, new CreateHabitRequest("Read", Frequency: "Daily"));

        var result = await service.ToggleEntryAsync(
            foreignId,
            habit.Value!.Id,
            new ToggleHabitEntryRequest(DateTime.UtcNow.Date.ToString("yyyy-MM-dd"), "UTC"));

        Assert.False(result.IsSuccess);
        Assert.Equal("HABIT_NOT_FOUND", ((HabitError)result.Error!).Code);
    }

    [Fact]
    public async Task GetStats_ComputesDailyLongestStreakAndRollingRates()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var habit = await service.CreateAsync(userId, new CreateHabitRequest("Read", Frequency: "Daily"));
        foreach (var offset in new[] { 0, -1, -2, -4, -5 })
        {
            await repository.ToggleEntryAsync(habit.Value!.Id, today.AddDays(offset));
        }

        var result = await service.GetStatsAsync(userId, habit.Value!.Id, "UTC");

        Assert.True(result.IsSuccess);
        Assert.Equal(3, result.Value!.CurrentStreak);
        Assert.Equal(3, result.Value.LongestStreak);
        Assert.Equal(5, result.Value.CompletedLast7Days);
        Assert.Equal(7, result.Value.ScheduledLast7Days);
        Assert.Equal(71.43, result.Value.Last7DaysCompletionRate);
        Assert.Equal(5, result.Value.CompletedLast30Days);
        Assert.Equal(30, result.Value.ScheduledLast30Days);
        Assert.Equal(16.67, result.Value.Last30DaysCompletionRate);
        Assert.Equal(today.ToString("yyyy-MM-dd"), result.Value.AsOfDate);
    }

    [Fact]
    public async Task GetStats_SkipsUnscheduledCustomDaysInStreaksAndRates()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var habit = await service.CreateAsync(
            userId,
            new CreateHabitRequest(
                "Workout",
                Frequency: "Custom",
                CustomDays: [today.DayOfWeek.ToString()]));
        foreach (var offset in new[] { 0, -7, -21 })
        {
            await repository.ToggleEntryAsync(habit.Value!.Id, today.AddDays(offset));
        }

        var result = await service.GetStatsAsync(userId, habit.Value!.Id, "UTC");

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.CurrentStreak);
        Assert.Equal(2, result.Value.LongestStreak);
        Assert.Equal(1, result.Value.CompletedLast7Days);
        Assert.Equal(1, result.Value.ScheduledLast7Days);
        Assert.Equal(100, result.Value.Last7DaysCompletionRate);
        Assert.Equal(3, result.Value.CompletedLast30Days);
        Assert.Equal(5, result.Value.ScheduledLast30Days);
        Assert.Equal(60, result.Value.Last30DaysCompletionRate);
    }

    [Fact]
    public async Task GetStats_RejectsInvalidTimezoneAndForeignHabit()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var habit = await service.CreateAsync(ownerId, new CreateHabitRequest("Read", Frequency: "Daily"));

        var invalidTimezone = await service.GetStatsAsync(ownerId, habit.Value!.Id, "Invalid/Zone");
        var foreign = await service.GetStatsAsync(foreignId, habit.Value.Id, "UTC");

        Assert.False(invalidTimezone.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((HabitError)invalidTimezone.Error!).Code);
        Assert.False(foreign.IsSuccess);
        Assert.Equal("HABIT_NOT_FOUND", ((HabitError)foreign.Error!).Code);
    }

    [Fact]
    public async Task List_RequiresValidTimeZone()
    {
        var service = new HabitService(new FakeHabitRepository());

        var result = await service.ListAsync(Guid.NewGuid(), "Invalid/Zone");

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((HabitError)result.Error!).Code);
    }

    [Fact]
    public async Task Create_RejectsUnknownIcon_AndDefaultsWhenOmitted()
    {
        var service = new HabitService(new FakeHabitRepository());
        var userId = Guid.NewGuid();

        var invalid = await service.CreateAsync(userId, new CreateHabitRequest("Read", Icon: "book"));
        var defaulted = await service.CreateAsync(userId, new CreateHabitRequest("Write"));

        Assert.False(invalid.IsSuccess);
        var error = Assert.IsType<HabitError>(invalid.Error);
        Assert.Contains("icon", Assert.IsType<Dictionary<string, string[]>>(error.Details).Keys);
        Assert.Equal("Default", defaulted.Value!.Icon);
    }

    private static DateTime NextUnscheduledDate(DateTime start, IReadOnlyList<string> scheduledDays)
    {
        var date = start;
        while (scheduledDays.Contains(date.DayOfWeek.ToString()))
        {
            date = date.AddDays(-1);
        }

        return date;
    }

    private sealed class FakeHabitRepository : IHabitRepository
    {
        private readonly List<HabitEntity> _habits = [];
        private readonly List<HabitEntry> _entries = [];

        public Task<IReadOnlyList<HabitEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<HabitEntity>>(_habits
                .Where(habit => habit.UserId == userId && habit.DeletedAt is null)
                .OrderBy(habit => habit.CreatedAt)
                .ToList());
        }

        public Task<HabitEntity?> GetAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_habits.FirstOrDefault(habit => habit.Id == habitId && habit.UserId == userId && habit.DeletedAt is null));
        }

        public Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(Guid habitId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<HabitEntry>>(_entries
                .Where(entry => entry.HabitId == habitId && entry.Date >= startDate.Date && entry.Date <= endDate.Date)
                .OrderBy(entry => entry.Date)
                .ToList());
        }

        public Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(IReadOnlyCollection<Guid> habitIds, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<HabitEntry>>(_entries
                .Where(entry => habitIds.Contains(entry.HabitId) && entry.Date >= startDate.Date && entry.Date <= endDate.Date)
                .OrderBy(entry => entry.Date)
                .ToList());
        }

        public Task AddAsync(HabitEntity habit, CancellationToken cancellationToken = default)
        {
            _habits.Add(habit);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(HabitEntity habit, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task<bool> ToggleEntryAsync(Guid habitId, DateTime date, CancellationToken cancellationToken = default)
        {
            var existing = _entries.FirstOrDefault(entry => entry.HabitId == habitId && entry.Date == date.Date);
            if (existing is not null)
            {
                _entries.Remove(existing);
                return Task.FromResult(false);
            }

            _entries.Add(HabitEntry.Create(habitId, date));
            return Task.FromResult(true);
        }
    }

    private sealed class RecordingHabitSyncNotifier : IHabitSyncNotifier
    {
        public List<(Guid UserId, Guid HabitId, string Date, bool IsCompleted)> CheckedItems { get; } = [];

        public Task HabitCheckedAsync(Guid userId, Guid habitId, string date, bool isCompleted, CancellationToken cancellationToken = default)
        {
            CheckedItems.Add((userId, habitId, date, isCompleted));
            return Task.CompletedTask;
        }
    }
}
