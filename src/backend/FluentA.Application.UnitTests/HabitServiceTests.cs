using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Application.UnitTests;

public sealed class HabitServiceTests
{
    [Theory]
    [InlineData(0, false, false)]
    [InlineData(1, true, false)]
    [InlineData(2, true, true)]
    [InlineData(3, false, true)]
    public async Task List_OptimizedLongestStreakMatchesCalendarWalkWithGapsAndGoals(int seed, bool custom, bool finite)
    {
        var repository = new FakeHabitRepository();
        var today = DateTime.UtcNow.Date;
        var owner = Guid.NewGuid();
        var habit = HabitEntity.Create(owner, "History", null, HabitIcon.Book,
            custom ? HabitFrequency.Custom : HabitFrequency.Daily,
            custom ? [DayOfWeek.Monday, DayOfWeek.Wednesday, DayOfWeek.Friday] : null,
            today.AddYears(-4), finite ? 23 : null);
        repository.SeedHabit(habit);
        var completed = new HashSet<DateTime>();
        var random = new Random(seed);
        for (var date = habit.StartDate; date <= today; date = date.AddDays(1))
            if (random.Next(5) != 0)
            {
                // Include legacy check-ins on now-unscheduled weekdays too.
                completed.Add(date);
                repository.SeedEntry(habit.Id, date);
            }
        var goalDate = finite && completed.Count >= 23 ? completed.Order().ElementAt(22) : (DateTime?)null;
        var asOf = goalDate.HasValue && goalDate < today ? goalDate.Value : today;
        var longest = 0;
        var run = 0;
        for (var date = habit.StartDate; date <= asOf; date = date.AddDays(1))
        {
            if (!habit.IsScheduledOn(date)) continue;
            run = completed.Contains(date) ? run + 1 : 0;
            longest = Math.Max(longest, run);
        }
        var result = await new HabitService(repository).ListAsync(owner);
        var item = Assert.Single(result.Value!);
        Assert.Equal(longest, item.LongestStreak);
        Assert.Equal(completed.Count, item.TotalCheckIns);
        Assert.Equal(goalDate?.ToString("yyyy-MM-dd"), item.GoalCompletedOn);
    }

    [Fact]
    public async Task List_SparseHistorySinceYearOneKeepsStatisticsWithoutWalkingEveryHistoricalDay()
    {
        var repository = new FakeHabitRepository();
        var today = DateTime.UtcNow.Date;
        var owner = Guid.NewGuid();
        var habit = HabitEntity.Create(owner, "Sparse history", null, HabitIcon.Book, HabitFrequency.Daily,
            null, new DateTime(1, 1, 1), null);
        repository.SeedHabit(habit);
        repository.SeedEntry(habit.Id, today.AddDays(-1));
        repository.SeedEntry(habit.Id, today);
        var item = Assert.Single((await new HabitService(repository).ListAsync(owner)).Value!);
        Assert.Equal(2, item.LongestStreak);
        Assert.Equal(2, item.CurrentStreak);
        Assert.Equal(2, item.TotalCheckIns);
    }

    [Fact]
    public async Task CreateListUpdateAndDelete_UseOwnedHabits()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();

        var created = await service.CreateAsync(userId, CreateRequest(" Read ", description: " Daily ", icon: "Book"));
        var listed = await service.ListAsync(userId);
        var updated = await service.UpdateAsync(
            userId,
            created.Value!.Id,
            new UpdateHabitRequest { Name = "Read English" });
        var deleted = await service.DeleteAsync(userId, created.Value.Id);
        var afterDelete = await service.ListAsync(userId);

        Assert.True(created.IsSuccess);
        Assert.Equal("Read", created.Value.Name);
        Assert.Equal("Book", created.Value.Icon);
        Assert.Single(listed.Value!);
        Assert.Equal("Read English", updated.Value!.Name);
        Assert.True(deleted.Value);
        Assert.Empty(afterDelete.Value!);
    }

    [Fact]
    public async Task Create_RejectsPastStartAndInvalidGoal()
    {
        var service = new HabitService(new FakeHabitRepository());
        var request = CreateRequest(
            "Read",
            startDate: DateTime.UtcNow.Date.AddDays(-1).ToString("yyyy-MM-dd"),
            goalDays: 0);

        var result = await service.CreateAsync(Guid.NewGuid(), request);

        Assert.False(result.IsSuccess);
        var details = Assert.IsType<Dictionary<string, string[]>>(Assert.IsType<HabitError>(result.Error).Details);
        Assert.Contains("startDate", details.Keys);
        Assert.Contains("goalDays", details.Keys);
    }

    [Fact]
    public async Task ToggleEntry_RejectsFutureUnscheduledAndPreStartDates()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);
        var customDay = tomorrow.DayOfWeek.ToString();
        var custom = await service.CreateAsync(
            userId,
            CreateRequest("Workout", frequency: "Custom", customDays: [customDay]));
        var futureStart = await service.CreateAsync(
            userId,
            CreateRequest("Future", startDate: tomorrow.ToString("yyyy-MM-dd")));

        var future = await service.ToggleEntryAsync(
            userId,
            custom.Value!.Id,
            new ToggleHabitEntryRequest(tomorrow.ToString("yyyy-MM-dd")));
        var notScheduled = await service.ToggleEntryAsync(
            userId,
            custom.Value.Id,
            new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")));
        var beforeStart = await service.ToggleEntryAsync(
            userId,
            futureStart.Value!.Id,
            new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")));

        Assert.False(future.IsSuccess);
        Assert.False(notScheduled.IsSuccess);
        Assert.False(beforeStart.IsSuccess);
        Assert.All(new[] { future, notScheduled, beforeStart }, result =>
            Assert.Equal("VALIDATION_ERROR", Assert.IsType<HabitError>(result.Error).Code));
    }

    [Fact]
    public async Task ToggleEntry_CreatesAndRemovesOneEntry()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var habit = await service.CreateAsync(userId, CreateRequest("Read"));

        var checkedResult = await service.ToggleEntryAsync(userId, habit.Value!.Id, new ToggleHabitEntryRequest(today));
        var entriesAfterCheck = await service.ListEntriesAsync(userId, habit.Value.Id, DateTime.UtcNow.ToString("yyyy-MM"));
        var uncheckedResult = await service.ToggleEntryAsync(userId, habit.Value.Id, new ToggleHabitEntryRequest(today));
        var entriesAfterUncheck = await service.ListEntriesAsync(userId, habit.Value.Id, DateTime.UtcNow.ToString("yyyy-MM"));

        Assert.True(checkedResult.Value!.IsCompleted);
        Assert.Equal(1, checkedResult.Value.TotalCheckIns);
        Assert.Single(entriesAfterCheck.Value!);
        Assert.False(uncheckedResult.Value!.IsCompleted);
        Assert.Equal(0, uncheckedResult.Value.TotalCheckIns);
        Assert.Empty(entriesAfterUncheck.Value!);
    }

    [Fact]
    public async Task ToggleEntry_GoalCompletionBlocksNewChecksAndUncheckReactivates()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var yesterday = DateTime.UtcNow.Date.AddDays(-1);
        var today = DateTime.UtcNow.Date;
        var habit = HabitEntity.Create(
            userId,
            "Read",
            null,
            HabitIcon.Book,
            HabitFrequency.Daily,
            null,
            yesterday,
            goalDays: 1);
        repository.SeedHabit(habit);
        repository.SeedEntry(habit.Id, yesterday);

        var blocked = await service.ToggleEntryAsync(
            userId,
            habit.Id,
            new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")));
        var uncheckedResult = await service.ToggleEntryAsync(
            userId,
            habit.Id,
            new ToggleHabitEntryRequest(yesterday.ToString("yyyy-MM-dd")));
        var reactivated = await service.ToggleEntryAsync(
            userId,
            habit.Id,
            new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")));

        Assert.False(blocked.IsSuccess);
        var blockedDetails = Assert.IsType<Dictionary<string, string[]>>(Assert.IsType<HabitError>(blocked.Error).Details);
        Assert.Contains("goal", blockedDetails["date"][0], StringComparison.OrdinalIgnoreCase);
        Assert.False(uncheckedResult.Value!.IsCompleted);
        Assert.True(reactivated.Value!.IsCompleted);
        Assert.True(reactivated.Value.IsGoalCompleted);
    }

    [Fact]
    public async Task List_ComputesMainPanelStatisticsAndFiniteGoalProgress()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var habit = HabitEntity.Create(
            userId,
            "Read",
            "A long-running habit",
            HabitIcon.Book,
            HabitFrequency.Daily,
            null,
            today.AddDays(-5),
            goalDays: 3);
        repository.SeedHabit(habit);
        repository.SeedEntry(habit.Id, today.AddDays(-3));
        repository.SeedEntry(habit.Id, today.AddDays(-1));
        repository.SeedEntry(habit.Id, today);

        var result = await service.ListAsync(userId, today.ToString("yyyy-MM"));

        var item = Assert.Single(result.Value!);
        Assert.Equal(3, item.TotalCheckIns);
        Assert.Equal(2, item.CurrentStreak);
        Assert.Equal(2, item.LongestStreak);
        Assert.True(item.IsGoalCompleted);
        Assert.Equal(today.ToString("yyyy-MM-dd"), item.GoalCompletedOn);
        Assert.Equal(0, item.RemainingGoalDays);
        Assert.False(item.CanEditStartDate);
    }

    [Fact]
    public async Task Update_EnforcesStartLockAndChangedGoalRuleButAllowsForever()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var userId = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var habit = HabitEntity.Create(
            userId,
            "Read",
            null,
            HabitIcon.Book,
            HabitFrequency.Daily,
            null,
            today,
            goalDays: 7);
        repository.SeedHabit(habit);
        repository.SeedEntry(habit.Id, today);

        var lockedStart = await service.UpdateAsync(
            userId,
            habit.Id,
            new UpdateHabitRequest { StartDate = today.AddDays(1).ToString("yyyy-MM-dd") });
        var tooSmallGoal = await service.UpdateAsync(
            userId,
            habit.Id,
            new UpdateHabitRequest { GoalDays = 1 });
        var forever = await service.UpdateAsync(
            userId,
            habit.Id,
            new UpdateHabitRequest { GoalDays = null });

        Assert.False(lockedStart.IsSuccess);
        Assert.False(tooSmallGoal.IsSuccess);
        Assert.True(forever.IsSuccess);
        Assert.Null(forever.Value!.GoalDays);
    }

    [Fact]
    public async Task ToggleEntry_ReturnsNotFoundForForeignHabit()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var ownerId = Guid.NewGuid();
        var habit = await service.CreateAsync(ownerId, CreateRequest("Read"));

        var result = await service.ToggleEntryAsync(
            Guid.NewGuid(),
            habit.Value!.Id,
            new ToggleHabitEntryRequest(DateTime.UtcNow.Date.ToString("yyyy-MM-dd")));

        Assert.False(result.IsSuccess);
        Assert.Equal("HABIT_NOT_FOUND", Assert.IsType<HabitError>(result.Error).Code);
    }

    [Fact]
    public async Task List_RequiresValidMonth()
    {
        var service = new HabitService(new FakeHabitRepository());

        var invalidMonth = await service.ListAsync(Guid.NewGuid(), "2026-99");

        Assert.False(invalidMonth.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", Assert.IsType<HabitError>(invalidMonth.Error).Code);
    }

    [Fact]
    public async Task Create_RejectsUnknownIcon_AndDefaultsWhenOmitted()
    {
        var service = new HabitService(new FakeHabitRepository());
        var userId = Guid.NewGuid();

        var invalid = await service.CreateAsync(userId, CreateRequest("Read", icon: "book"));
        var defaulted = await service.CreateAsync(userId, CreateRequest("Write"));

        Assert.False(invalid.IsSuccess);
        var error = Assert.IsType<HabitError>(invalid.Error);
        Assert.Contains("icon", Assert.IsType<Dictionary<string, string[]>>(error.Details).Keys);
        Assert.Equal("Default", defaulted.Value!.Icon);
    }

    [Fact]
    public async Task Delete_RetainsCheckIns_RejectsForeignAndRepeatedDeletes_AndBlocksAccess()
    {
        var repository = new FakeHabitRepository();
        var service = new HabitService(repository);
        var owner = Guid.NewGuid();
        var today = DateTime.UtcNow.Date;
        var created = await service.CreateAsync(owner, CreateRequest("Read"));
        var id = created.Value!.Id;
        await service.ToggleEntryAsync(owner, id, new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")));

        var foreign = await service.DeleteAsync(Guid.NewGuid(), id);
        Assert.False(foreign.IsSuccess);
        Assert.Single((await service.ListAsync(owner)).Value!);
        Assert.True((await service.DeleteAsync(owner, id)).IsSuccess);
        Assert.Equal(1, await repository.CountEntriesAsync(id));
        Assert.Empty((await service.ListAsync(owner)).Value!);

        Assert.False((await service.DeleteAsync(owner, id)).IsSuccess);
        Assert.False((await service.UpdateAsync(owner, id, new UpdateHabitRequest { Name = "Renamed" })).IsSuccess);
        Assert.False((await service.ListEntriesAsync(owner, id, today.ToString("yyyy-MM"))).IsSuccess);
        Assert.False((await service.ToggleEntryAsync(owner, id, new ToggleHabitEntryRequest(today.ToString("yyyy-MM-dd")))).IsSuccess);
        Assert.Equal(1, await repository.CountEntriesAsync(id));
    }

    private static CreateHabitRequest CreateRequest(
        string name,
        string? description = null,
        string icon = "Default",
        string frequency = "Daily",
        IReadOnlyList<string>? customDays = null,
        string? startDate = null,
        int? goalDays = null)
    {
        return new CreateHabitRequest(
            name,
            description,
            icon,
            frequency,
            customDays,
            StartDate: startDate ?? DateTime.UtcNow.Date.ToString("yyyy-MM-dd"),
            GoalDays: goalDays);
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
            return Task.FromResult(_habits.FirstOrDefault(habit =>
                habit.Id == habitId && habit.UserId == userId && habit.DeletedAt is null));
        }

        public Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(
            Guid habitId,
            DateTime startDate,
            DateTime endDate,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<HabitEntry>>(_entries
                .Where(entry => entry.HabitId == habitId
                    && entry.DeletedAt is null
                    && entry.Date >= startDate.Date
                    && entry.Date <= endDate.Date)
                .OrderBy(entry => entry.Date)
                .ToList());
        }

        public Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(
            IReadOnlyCollection<Guid> habitIds,
            DateTime startDate,
            DateTime endDate,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<HabitEntry>>(_entries
                .Where(entry => habitIds.Contains(entry.HabitId)
                    && entry.DeletedAt is null
                    && entry.Date >= startDate.Date
                    && entry.Date <= endDate.Date)
                .OrderBy(entry => entry.Date)
                .ToList());
        }

        public Task<int> CountEntriesAsync(Guid habitId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_entries.Count(entry => entry.HabitId == habitId && entry.DeletedAt is null));
        }

        public Task<IReadOnlyList<HabitCheckInDate>> ListCheckInDatesAsync(
            IReadOnlyCollection<Guid> habitIds, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<HabitCheckInDate>>(_entries
                .Where(entry => habitIds.Contains(entry.HabitId) && entry.DeletedAt is null && entry.Date >= startDate && entry.Date <= endDate)
                .Select(entry => new HabitCheckInDate(entry.HabitId, entry.Date)).ToList());

        public Task AddAsync(HabitEntity habit, CancellationToken cancellationToken = default)
        {
            _habits.Add(habit);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(HabitEntity habit, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public async Task<bool> SoftDeleteAsync(Guid userId, Guid habitId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var habit = await GetAsync(userId, habitId, cancellationToken);
            if (habit is null) return false;
            habit.SoftDelete(nowUtc);
            return true;
        }

        public Task<HabitEntryMutationResult> ToggleEntryAsync(
            Guid userId,
            Guid habitId,
            DateTime date,
            CancellationToken cancellationToken = default)
        {
            var habit = _habits.FirstOrDefault(candidate =>
                candidate.Id == habitId && candidate.UserId == userId && candidate.DeletedAt is null);
            if (habit is null)
            {
                return Task.FromResult(new HabitEntryMutationResult(HabitEntryMutationStatus.NotFound, 0, null));
            }

            var existing = _entries.FirstOrDefault(entry => entry.HabitId == habitId && entry.Date == date.Date);
            var currentCount = _entries.Count(entry => entry.HabitId == habitId && entry.DeletedAt is null);
            if (existing is not null)
            {
                _entries.Remove(existing);
                return Task.FromResult(new HabitEntryMutationResult(
                    HabitEntryMutationStatus.Unchecked,
                    currentCount - 1,
                    habit.GoalDays));
            }

            if (!habit.IsStartedOn(date))
            {
                return Task.FromResult(new HabitEntryMutationResult(HabitEntryMutationStatus.BeforeStart, currentCount, habit.GoalDays));
            }

            if (!habit.IsScheduledOn(date))
            {
                return Task.FromResult(new HabitEntryMutationResult(HabitEntryMutationStatus.Unscheduled, currentCount, habit.GoalDays));
            }

            if (habit.GoalDays.HasValue && currentCount >= habit.GoalDays.Value)
            {
                return Task.FromResult(new HabitEntryMutationResult(HabitEntryMutationStatus.GoalReached, currentCount, habit.GoalDays));
            }

            _entries.Add(HabitEntry.Create(habitId, date));
            return Task.FromResult(new HabitEntryMutationResult(
                HabitEntryMutationStatus.Checked,
                currentCount + 1,
                habit.GoalDays));
        }

        public void SeedHabit(HabitEntity habit) => _habits.Add(habit);

        public void SeedEntry(Guid habitId, DateTime date) => _entries.Add(HabitEntry.Create(habitId, date));
    }
}
