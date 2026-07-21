using System.Text.Json;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Services;

namespace FluentA.Application.UnitTests;

public sealed class TodoServiceTests
{
    private static readonly JsonSerializerOptions WebJson = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task CreateListUpdateAndDelete_UseOwnedItems()
    {
        var repository = new FakeTodoRepository();
        var notifier = new RecordingTodoSyncNotifier();
        var service = new TodoService(repository, notifier);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var created = await service.CreateAsync(userId, new CreateTodoItemRequest(" Review IELTS ", date, " Unit 3 ", IsImportant: true));
        var listed = await service.ListByDateAsync(userId, date);
        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var deleted = await service.DeleteAsync(userId, created.Value.Id);
        var afterDelete = await service.ListByDateAsync(userId, date);
        var deletedById = await service.GetAsync(userId, created.Value.Id);

        Assert.True(created.IsSuccess);
        Assert.Equal("Review IELTS", created.Value.Title);
        Assert.Equal("Unit 3", created.Value.Note);
        Assert.True(created.Value.IsImportant);
        Assert.Single(listed.Value!);
        Assert.True(updated.Value!.IsCompleted);
        Assert.NotNull(updated.Value.CompletedAt);
        Assert.Single(notifier.CheckedItems);
        Assert.Equal(created.Value.Id, notifier.CheckedItems[0].TodoId);
        Assert.True(deleted.Value);
        Assert.Empty(afterDelete.Value!);
        Assert.False(deletedById.IsSuccess);
        Assert.Equal("TODO_NOT_FOUND", ((TodoError)deletedById.Error!).Code);
    }

    [Fact]
    public async Task ListByDate_DoesNotCarryOverIncompletePastTasks()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var yesterday = DateTime.UtcNow.Date.AddDays(-1).ToString("yyyy-MM-dd");
        var today = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var incomplete = await service.CreateAsync(userId, new CreateTodoItemRequest("Read chapter", yesterday));
        var completed = await service.CreateAsync(userId, new CreateTodoItemRequest("Done already", yesterday));
        await service.UpdateAsync(userId, completed.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        var first = await service.ListByDateAsync(userId, today);
        var second = await service.ListByDateAsync(userId, today);

        Assert.Empty(first.Value!);
        Assert.Empty(second.Value!);
        Assert.NotNull(incomplete.Value);
    }

    [Fact]
    public async Task Update_AppliesOnlySuppliedFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Task", date, "keep", IsImportant: true));

        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(Title: "Renamed"));

        Assert.Equal("Renamed", updated.Value!.Title);
        Assert.Equal("keep", updated.Value.Note);
        Assert.Equal(date, updated.Value.Date);
        Assert.False(updated.Value.IsCompleted);
        Assert.True(updated.Value.IsImportant);
    }

    [Fact]
    public async Task Update_Completion_PreserveUnrelatedFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Task", date, "keep", IsImportant: true));

        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        Assert.True(updated.IsSuccess);
        Assert.Equal("Task", updated.Value!.Title);
        Assert.Equal("keep", updated.Value.Note);
        Assert.Equal(date, updated.Value.Date);
        Assert.True(updated.Value.IsCompleted);
        Assert.True(updated.Value.IsImportant);
    }

    [Fact]
    public async Task Update_Importance_PersistsAndPreservesUnrelatedFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Task", date, "keep"));

        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsImportant: true));

        Assert.True(updated.IsSuccess);
        Assert.True(updated.Value!.IsImportant);
        Assert.Equal("Task", updated.Value.Title);
        Assert.Equal("keep", updated.Value.Note);
        Assert.Equal(date, updated.Value.Date);
        Assert.False(updated.Value.IsCompleted);
    }

    [Fact]
    public async Task Update_ReturnsNotFoundForForeignItem()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(ownerId, new CreateTodoItemRequest("Task", date));

        var result = await service.UpdateAsync(foreignId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        Assert.False(result.IsSuccess);
        Assert.Equal("TODO_NOT_FOUND", ((TodoError)result.Error!).Code);
    }

    [Fact]
    public async Task Update_MoveAndReorder_PersistsOwnedTaskAndPreservesFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var monday = DateTime.UtcNow.Date.AddDays(1).ToString("yyyy-MM-dd");
        var tuesday = DateTime.UtcNow.Date.AddDays(2).ToString("yyyy-MM-dd");
        var first = await service.CreateAsync(userId, new CreateTodoItemRequest("First", monday, "keep", IsImportant: true));
        var second = await service.CreateAsync(userId, new CreateTodoItemRequest("Second", monday));

        var reordered = await service.UpdateAsync(userId, second.Value!.Id, new UpdateTodoItemRequest(SortOrder: 0));
        var moved = await service.UpdateAsync(userId, first.Value!.Id, new UpdateTodoItemRequest(Date: tuesday, SortOrder: 0));
        var mondayItems = await service.ListByDateAsync(userId, monday);
        var tuesdayItems = await service.ListByDateAsync(userId, tuesday);

        Assert.True(reordered.IsSuccess);
        Assert.True(moved.IsSuccess);
        Assert.Equal(["Second"], mondayItems.Value!.Select(item => item.Title));
        Assert.Equal(["First"], tuesdayItems.Value!.Select(item => item.Title));
        Assert.Equal("keep", moved.Value!.Note);
        Assert.True(moved.Value.IsImportant);
        Assert.Equal(0, moved.Value.SortOrder);
    }

    [Fact]
    public async Task InvalidInputs_ReturnValidationErrorsAndDoNotNotify()
    {
        var notifier = new RecordingTodoSyncNotifier();
        var service = new TodoService(new FakeTodoRepository(), notifier);

        var created = await service.CreateAsync(Guid.NewGuid(), new CreateTodoItemRequest("", "not-a-date"));

        Assert.False(created.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((TodoError)created.Error!).Code);
        Assert.Empty(notifier.CheckedItems);
    }

    [Fact]
    public async Task RepeatPattern_CreateUpdateAndClear_UsesExactOptionalValues()
    {
        var service = new TodoService(new FakeTodoRepository());
        var userId = Guid.NewGuid();
        var date = "2026-07-22";

        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Repeat me", date, RepeatPattern: "Daily"));
        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest { RepeatPattern = "Weekdays" });
        var cleared = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest { RepeatPattern = null });
        var invalid = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest { RepeatPattern = "daily" });

        Assert.Equal("Daily", created.Value.RepeatPattern);
        Assert.Equal("Weekdays", updated.Value!.RepeatPattern);
        Assert.Null(cleared.Value!.RepeatPattern);
        Assert.False(invalid.IsSuccess);
        var details = Assert.IsType<Dictionary<string, string[]>>(((TodoError)invalid.Error!).Details);
        Assert.Contains("repeatPattern", details.Keys);
    }

    [Fact]
    public void UpdateRequest_DistinguishesOmittedRepeatFromExplicitNull()
    {
        var omitted = JsonSerializer.Deserialize<UpdateTodoItemRequest>("{\"isCompleted\":true}", WebJson)!;
        var cleared = JsonSerializer.Deserialize<UpdateTodoItemRequest>("{\"repeatPattern\":null}", WebJson)!;

        Assert.False(omitted.IsRepeatPatternSpecified);
        Assert.True(cleared.IsRepeatPatternSpecified);
        Assert.Null(cleared.RepeatPattern);
    }

    [Fact]
    public void UpdateRequest_DistinguishesOmittedReminderFromExplicitNull()
    {
        var omitted = JsonSerializer.Deserialize<UpdateTodoItemRequest>("{\"isImportant\":true}", WebJson)!;
        var cleared = JsonSerializer.Deserialize<UpdateTodoItemRequest>("{\"reminder\":null}", WebJson)!;

        Assert.False(omitted.IsReminderSpecified);
        Assert.True(cleared.IsReminderSpecified);
        Assert.Null(cleared.Reminder);
    }

    [Fact]
    public async Task Reminder_CreateGetUpdateAndClear_RoundTripsExactOwnedTuple()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var ownerId = Guid.NewGuid();
        var scheduledAtUtc = new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Utc);

        var created = await service.CreateAsync(ownerId, new CreateTodoItemRequest(
            "Timed task",
            "2035-07-22",
            Reminder: new TodoReminderRequest("09:30", "America/New_York", scheduledAtUtc)));
        var owned = await service.GetAsync(ownerId, created.Value!.Id);
        var foreign = await service.GetAsync(Guid.NewGuid(), created.Value.Id);
        var updated = await service.UpdateAsync(ownerId, created.Value.Id, new UpdateTodoItemRequest
        {
            Reminder = new TodoReminderRequest(
                "10:15",
                "America/New_York",
                new DateTime(2035, 7, 22, 14, 15, 0, DateTimeKind.Utc)),
        });
        var cleared = await service.UpdateAsync(ownerId, created.Value.Id, new UpdateTodoItemRequest { Reminder = null });

        Assert.True(created.IsSuccess);
        Assert.Equal("09:30", owned.Value!.Reminder!.Time);
        Assert.Equal("America/New_York", owned.Value.Reminder.TimeZoneId);
        Assert.Equal(scheduledAtUtc, owned.Value.Reminder.ScheduledAtUtc);
        Assert.False(foreign.IsSuccess);
        Assert.Equal("TODO_NOT_FOUND", ((TodoError)foreign.Error!).Code);
        Assert.Equal("10:15", updated.Value!.Reminder!.Time);
        Assert.Null(cleared.Value!.Reminder);
    }

    [Theory]
    [InlineData("09:31", "America/New_York", "2035-07-22T13:30:00Z", "reminder.scheduledAtUtc")]
    [InlineData("09:30", "Invalid/Timezone", "2035-07-22T13:30:00Z", "reminder.timeZoneId")]
    [InlineData("9:30", "America/New_York", "2035-07-22T13:30:00Z", "reminder.time")]
    [InlineData("09:30", "America/New_York", "2020-07-22T13:30:00Z", "reminder.scheduledAtUtc")]
    public async Task Reminder_RejectsMismatchedInvalidOrPastTuples(
        string time,
        string timeZoneId,
        string scheduledAtUtc,
        string expectedField)
    {
        var service = new TodoService(new FakeTodoRepository());
        var request = new TodoReminderRequest(
            time,
            timeZoneId,
            DateTime.Parse(scheduledAtUtc, null, System.Globalization.DateTimeStyles.AdjustToUniversal));

        var result = await service.CreateAsync(
            Guid.NewGuid(),
            new CreateTodoItemRequest("Invalid reminder", time.StartsWith("09") && scheduledAtUtc.StartsWith("2020") ? "2020-07-22" : "2035-07-22", Reminder: request));

        Assert.False(result.IsSuccess);
        var details = Assert.IsType<Dictionary<string, string[]>>(((TodoError)result.Error!).Details);
        Assert.Contains(expectedField, details.Keys);
    }

    [Fact]
    public async Task Reminder_RejectsAnInstantWithoutUtcKind()
    {
        var service = new TodoService(new FakeTodoRepository());

        var result = await service.CreateAsync(Guid.NewGuid(), new CreateTodoItemRequest(
            "Unspecified reminder",
            "2035-07-22",
            Reminder: new TodoReminderRequest(
                "09:30",
                "America/New_York",
                new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Unspecified))));

        Assert.False(result.IsSuccess);
        var details = Assert.IsType<Dictionary<string, string[]>>(((TodoError)result.Error!).Details);
        Assert.Contains("reminder.scheduledAtUtc", details.Keys);
    }

    [Fact]
    public async Task Reminder_DateMoveRecomputesFutureInstantAndClearsPastWithWarning()
    {
        var service = new TodoService(new FakeTodoRepository());
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest(
            "Move reminder",
            "2035-07-22",
            Reminder: new TodoReminderRequest(
                "09:30",
                "America/New_York",
                new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Utc))));

        var movedFuture = await service.UpdateAsync(
            userId,
            created.Value!.Id,
            new UpdateTodoItemRequest(Date: "2035-07-23"));
        var movedPast = await service.UpdateAsync(
            userId,
            created.Value.Id,
            new UpdateTodoItemRequest(Date: "2020-07-23"));

        Assert.Equal(new DateTime(2035, 7, 23, 13, 30, 0, DateTimeKind.Utc), movedFuture.Value!.Reminder!.ScheduledAtUtc);
        Assert.Null(movedPast.Value!.Reminder);
        Assert.Equal("reminder-cleared-after-date-change", movedPast.Value.WarningCode);
    }

    [Fact]
    public async Task Reminder_CompletionCancelsSourceAndRecurringChildReceivesNewSchedule()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest(
            "Daily reminder",
            "2035-07-22",
            RepeatPattern: "Daily",
            Reminder: new TodoReminderRequest(
                "09:30",
                "America/New_York",
                new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Utc))));

        var completed = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var nextDay = await service.ListByDateAsync(userId, "2035-07-23");

        Assert.Null(completed.Value!.Reminder);
        var child = Assert.Single(nextDay.Value!);
        Assert.Equal("09:30", child.Reminder!.Time);
        Assert.Equal(new DateTime(2035, 7, 23, 13, 30, 0, DateTimeKind.Utc), child.Reminder.ScheduledAtUtc);
    }

    [Fact]
    public async Task Reminder_CannotBeSetWhileTaskRemainsCompleted()
    {
        var service = new TodoService(new FakeTodoRepository());
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Completed task", "2035-07-22"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        var result = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest
        {
            Reminder = new TodoReminderRequest(
                "09:30",
                "America/New_York",
                new DateTime(2035, 7, 22, 13, 30, 0, DateTimeKind.Utc)),
        });

        Assert.False(result.IsSuccess);
        var details = Assert.IsType<Dictionary<string, string[]>>(((TodoError)result.Error!).Details);
        Assert.Contains("reminder", details.Keys);
    }

    [Fact]
    public async Task CompleteRecurringOccurrence_CreatesExactlyOneCopiedNextOccurrence()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(
            userId,
            new CreateTodoItemRequest("Month end", "2026-01-31", "Keep note", IsImportant: true, RepeatPattern: "Monthly"));

        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var nextDay = await service.ListByDateAsync(userId, "2026-02-28");

        var next = Assert.Single(nextDay.Value!);
        Assert.NotEqual(created.Value.Id, next.Id);
        Assert.Equal("Month end", next.Title);
        Assert.Equal("Keep note", next.Note);
        Assert.True(next.IsImportant);
        Assert.Equal("Monthly", next.RepeatPattern);
        Assert.False(next.IsCompleted);
    }

    [Fact]
    public async Task ReopenRecurringOccurrence_RemovesPristineGeneratedChild()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Daily", "2026-07-22", RepeatPattern: "Daily"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        var reopened = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(IsCompleted: false));
        var nextDay = await service.ListByDateAsync(userId, "2026-07-23");

        Assert.False(reopened.Value!.IsCompleted);
        Assert.Null(reopened.Value.WarningCode);
        Assert.Empty(nextDay.Value!);
    }

    [Fact]
    public async Task ReopenRecurringOccurrence_RetainsEditedChildAndReturnsWarning()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Daily", "2026-07-22", RepeatPattern: "Daily"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var nextDay = await service.ListByDateAsync(userId, "2026-07-23");
        var generated = Assert.Single(nextDay.Value!);
        await service.UpdateAsync(userId, generated.Id, new UpdateTodoItemRequest(Title: "Edited next task"));

        var reopened = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(IsCompleted: false));
        var retained = await service.ListByDateAsync(userId, "2026-07-23");

        Assert.Equal("recurrence-next-retained", reopened.Value!.WarningCode);
        Assert.Equal("Edited next task", Assert.Single(retained.Value!).Title);
    }

    [Fact]
    public async Task DeleteGeneratedOccurrence_DoesNotDeleteSourceOrCreateAnotherOccurrence()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Daily", "2026-07-22", RepeatPattern: "Daily"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var generated = Assert.Single((await service.ListByDateAsync(userId, "2026-07-23")).Value!);

        await service.DeleteAsync(userId, generated.Id);
        var source = await service.ListByDateAsync(userId, "2026-07-22");
        var nextDay = await service.ListByDateAsync(userId, "2026-07-23");

        Assert.Single(source.Value!);
        Assert.Empty(nextDay.Value!);
    }

    [Fact]
    public async Task DeleteSourceOccurrence_DoesNotCascadeToGeneratedChild()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Daily", "2026-07-22", RepeatPattern: "Daily"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        await service.DeleteAsync(userId, created.Value.Id);
        var sourceDay = await service.ListByDateAsync(userId, "2026-07-22");
        var generatedDay = await service.ListByDateAsync(userId, "2026-07-23");

        Assert.Empty(sourceDay.Value!);
        Assert.Single(generatedDay.Value!);
    }

    private sealed class FakeTodoRepository : ITodoRepository
    {
        private readonly List<TodoItem> _items = [];

        public Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date == date.Date && item.DeletedAt is null)
                .OrderBy(item => item.IsCompleted)
                .ThenBy(item => item.SortOrder)
                .ThenBy(item => item.CompletedAt ?? item.CreatedAt)
                .ToList());
        }

        public Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date >= startDate.Date && item.Date <= endDate.Date && item.DeletedAt is null)
                .OrderBy(item => item.Date)
                .ThenBy(item => item.IsCompleted)
                .ThenBy(item => item.SortOrder)
                .ThenBy(item => item.CompletedAt ?? item.CreatedAt)
                .ToList());
        }

        public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.FirstOrDefault(item => item.UserId == userId && item.Id == todoId && item.DeletedAt is null));
        }

        public Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
        {
            var next = _items.Where(item => item.UserId == userId && item.Date == date.Date && item.DeletedAt is null).Select(item => item.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            return Task.FromResult(next);
        }

        public Task AddAsync(TodoItem item, CancellationToken cancellationToken = default)
        {
            _items.Add(item);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

        public Task UpdateRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<TodoCompletionMutationResult?> SetCompletionAsync(
            Guid userId,
            Guid todoId,
            bool isCompleted,
            DateTime nowUtc,
            CancellationToken cancellationToken = default)
        {
            var item = _items.FirstOrDefault(candidate => candidate.UserId == userId && candidate.Id == todoId && candidate.DeletedAt is null);
            if (item is null)
            {
                return Task.FromResult<TodoCompletionMutationResult?>(null);
            }

            if (item.IsCompleted == isCompleted)
            {
                return Task.FromResult<TodoCompletionMutationResult?>(new TodoCompletionMutationResult(item, false));
            }

            var retained = false;
            if (isCompleted)
            {
                var reminderTime = item.ReminderTime;
                var reminderTimeZoneId = item.ReminderTimeZoneId;
                item.MarkGeneratedOccurrenceEdited();
                item.SetCompleted(true, nowUtc);
                item.CancelUnsentReminder();
                if (item.RepeatPattern is not null
                    && !_items.Any(candidate => candidate.GeneratedFromTodoId == item.Id && candidate.DeletedAt is null))
                {
                    var nextDate = TodoRepeatSchedule.NextDate(item.Date, item.RepeatPattern.Value);
                    var sortOrder = _items
                        .Where(candidate => candidate.UserId == userId && candidate.Date == nextDate && candidate.DeletedAt is null)
                        .Select(candidate => candidate.SortOrder)
                        .DefaultIfEmpty(-1)
                        .Max() + 1;
                    var child = TodoItem.CreateGeneratedOccurrence(item, nextDate, sortOrder);
                    if (reminderTime is not null && reminderTimeZoneId is not null)
                    {
                        var timeZone = TimeZoneInfo.FindSystemTimeZoneById(reminderTimeZoneId);
                        child.SetReminder(
                            reminderTime.Value,
                            reminderTimeZoneId,
                            TodoReminderSchedule.ResolveUtc(nextDate, reminderTime.Value, timeZone));
                    }

                    _items.Add(child);
                }
            }
            else
            {
                var child = _items.FirstOrDefault(candidate => candidate.UserId == userId
                    && candidate.GeneratedFromTodoId == item.Id
                    && candidate.DeletedAt is null);
                if (child?.IsGeneratedOccurrencePristine == true)
                {
                    child.SoftDelete();
                }
                else if (child is not null)
                {
                    retained = true;
                }

                item.MarkGeneratedOccurrenceEdited();
                item.SetCompleted(false, nowUtc);
            }

            return Task.FromResult<TodoCompletionMutationResult?>(new TodoCompletionMutationResult(item, retained));
        }
    }

    private sealed class RecordingTodoSyncNotifier : ITodoSyncNotifier
    {
        public List<(Guid UserId, Guid TodoId, bool IsCompleted)> CheckedItems { get; } = [];

        public Task TodoItemCheckedAsync(Guid userId, Guid todoId, bool isCompleted, CancellationToken cancellationToken = default)
        {
            CheckedItems.Add((userId, todoId, isCompleted));
            return Task.CompletedTask;
        }
    }
}
