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
        var service = new TodoService(repository);
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
    public async Task InvalidInputs_ReturnValidationErrors()
    {
        var service = new TodoService(new FakeTodoRepository());

        var created = await service.CreateAsync(Guid.NewGuid(), new CreateTodoItemRequest("", "not-a-date"));

        Assert.False(created.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((TodoError)created.Error!).Code);
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
    public async Task Duplicate_CopiesAllApprovedFieldsOnTheSameDayUnderANewIncompleteIdentity()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var priority = await service.CreatePriorityAsync(userId, new CreateTodoPriorityRequest("Urgent", "destructive"));
        var tag = await service.CreateTagAsync(userId, new CreateTodoTagRequest("#FluentA"));

        var source = await service.CreateAsync(userId, new CreateTodoItemRequest(
            "Duplicate source",
            "2035-07-22",
            "Hidden note",
            IsImportant: true,
            RepeatPattern: "Weekly",
            PriorityId: priority.Value!.Id,
            ScheduledStartTime: "09:00",
            ScheduledEndTime: "10:30",
            TagIds: [tag.Value!.Id]));
        var subtask = await service.CreateSubtaskAsync(userId, source.Value!.Id, new CreateTodoSubtaskRequest("Step 1"));
        await service.UpdateSubtaskAsync(userId, source.Value.Id, subtask.Value!.Id, new UpdateTodoSubtaskRequest(IsCompleted: true));

        var duplicate = await service.DuplicateAsync(userId, source.Value.Id);
        var day = await service.ListByDateAsync(userId, source.Value.Date);

        Assert.True(duplicate.IsSuccess);
        Assert.NotEqual(source.Value.Id, duplicate.Value!.Id);
        Assert.Equal(source.Value.Date, duplicate.Value.Date);
        Assert.Equal("Duplicate source", duplicate.Value.Title);
        Assert.Equal("Hidden note", duplicate.Value.Note);
        Assert.True(duplicate.Value.IsImportant);
        Assert.Equal("Weekly", duplicate.Value.RepeatPattern);
        Assert.Equal(priority.Value.Id, duplicate.Value.PriorityId);
        Assert.Equal("Urgent", duplicate.Value.Priority?.Name);
        Assert.Equal("09:00", duplicate.Value.ScheduledStartTime);
        Assert.Equal("10:30", duplicate.Value.ScheduledEndTime);
        Assert.Equal(90, duplicate.Value.EstimatedMinutes);
        Assert.Equal("FluentA", Assert.Single(duplicate.Value.Tags!).Name);
        var copiedSubtask = Assert.Single(duplicate.Value.Subtasks!);
        Assert.Equal("Step 1", copiedSubtask.Title);
        Assert.False(copiedSubtask.IsCompleted);
        Assert.False(duplicate.Value.IsCompleted);
        Assert.Equal(1, duplicate.Value.SortOrder);
        Assert.Equal(2, day.Value!.Count);
        Assert.Equal(source.Value.Id, day.Value[0].Id);
    }

    [Fact]
    public async Task Duplicate_ReturnsNotFoundForForeignOrDeletedSource()
    {
        var service = new TodoService(new FakeTodoRepository());
        var ownerId = Guid.NewGuid();
        var source = await service.CreateAsync(ownerId, new CreateTodoItemRequest("Owned source", "2035-07-22"));

        var foreign = await service.DuplicateAsync(Guid.NewGuid(), source.Value!.Id);
        await service.DeleteAsync(ownerId, source.Value.Id);
        var deleted = await service.DuplicateAsync(ownerId, source.Value.Id);

        Assert.False(foreign.IsSuccess);
        Assert.False(deleted.IsSuccess);
        Assert.Equal("TODO_NOT_FOUND", ((TodoError)foreign.Error!).Code);
        Assert.Equal("TODO_NOT_FOUND", ((TodoError)deleted.Error!).Code);
    }

    [Fact]
    public async Task CompleteRecurringOccurrence_CreatesExactlyOneCopiedNextOccurrence()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var priority = await service.CreatePriorityAsync(userId, new CreateTodoPriorityRequest("High", "warning"));
        var tag = await service.CreateTagAsync(userId, new CreateTodoTagRequest("IELTS"));
        var created = await service.CreateAsync(
            userId,
            new CreateTodoItemRequest(
                "Month end",
                "2026-01-31",
                "Keep note",
                IsImportant: true,
                RepeatPattern: "Monthly",
                PriorityId: priority.Value!.Id,
                ScheduledStartTime: "14:00",
                ScheduledEndTime: "15:00",
                TagIds: [tag.Value!.Id]));
        var subtask = await service.CreateSubtaskAsync(userId, created.Value!.Id, new CreateTodoSubtaskRequest("Draft outline"));
        await service.UpdateSubtaskAsync(userId, created.Value.Id, subtask.Value!.Id, new UpdateTodoSubtaskRequest(IsCompleted: true));

        await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(IsCompleted: true));
        await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var nextDay = await service.ListByDateAsync(userId, "2026-02-28");

        var next = Assert.Single(nextDay.Value!);
        Assert.NotEqual(created.Value.Id, next.Id);
        Assert.Equal("Month end", next.Title);
        Assert.Equal("Keep note", next.Note);
        Assert.True(next.IsImportant);
        Assert.Equal("Monthly", next.RepeatPattern);
        Assert.Equal("High", next.Priority?.Name);
        Assert.Equal("14:00", next.ScheduledStartTime);
        Assert.Equal("15:00", next.ScheduledEndTime);
        Assert.Equal(60, next.EstimatedMinutes);
        Assert.Equal("IELTS", Assert.Single(next.Tags!).Name);
        Assert.False(Assert.Single(next.Subtasks!).IsCompleted);
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
    public async Task DeleteSourceOccurrence_SoftDeletesFutureGeneratedChild()
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
        Assert.Empty(generatedDay.Value!);
    }

    [Fact]
    public async Task CustomPriorities_CreateRenameDelete_EnforcesDuplicatesAndClearsTasks()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();

        var created = await service.CreatePriorityAsync(userId, new CreateTodoPriorityRequest("Deep Work", "primary"));
        var duplicate = await service.CreatePriorityAsync(userId, new CreateTodoPriorityRequest("deep work", "warning"));
        var task = await service.CreateAsync(userId, new CreateTodoItemRequest("Study", "2026-11-24", PriorityId: created.Value!.Id));
        var renamed = await service.UpdatePriorityAsync(userId, created.Value.Id, new UpdateTodoPriorityRequest(Name: "Focus", Tone: "warning"));
        var deleted = await service.DeletePriorityAsync(userId, created.Value.Id);
        var fetchedTask = await service.GetAsync(userId, task.Value!.Id);

        Assert.True(created.IsSuccess);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("TODO_PRIORITY_DUPLICATE", ((TodoError)duplicate.Error!).Code);
        Assert.Equal("Focus", renamed.Value!.Name);
        Assert.Equal("warning", renamed.Value.Tone);
        Assert.True(deleted.Value);
        Assert.Null(fetchedTask.Value!.PriorityId);
        Assert.Null(fetchedTask.Value.Priority);
    }

    [Fact]
    public async Task ManualTags_CreateAttachAndDelete_NormalizesAndDetaches()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();

        var tag = await service.CreateTagAsync(userId, new CreateTodoTagRequest("#IELTS"));
        var duplicate = await service.CreateTagAsync(userId, new CreateTodoTagRequest("ielts"));
        var task = await service.CreateAsync(userId, new CreateTodoItemRequest("Essay", "2026-11-24"));
        var attached = await service.UpdateAsync(userId, task.Value!.Id, new UpdateTodoItemRequest { TagIds = [tag.Value!.Id] });
        var deleted = await service.DeleteTagAsync(userId, tag.Value.Id);
        var afterDelete = await service.GetAsync(userId, task.Value.Id);

        Assert.Equal("IELTS", tag.Value.Name);
        Assert.False(duplicate.IsSuccess);
        Assert.Equal("TODO_TAG_DUPLICATE", ((TodoError)duplicate.Error!).Code);
        Assert.Equal("IELTS", Assert.Single(attached.Value!.Tags!).Name);
        Assert.True(deleted.Value);
        Assert.Empty(afterDelete.Value!.Tags!);
    }

    [Fact]
    public async Task ScheduledTime_ComputesMinutesAndValidatesRange()
    {
        var service = new TodoService(new FakeTodoRepository());
        var userId = Guid.NewGuid();

        var invalid = await service.CreateAsync(userId, new CreateTodoItemRequest(
            "Invalid",
            "2026-11-24",
            ScheduledStartTime: "10:30",
            ScheduledEndTime: "09:00"));
        var valid = await service.CreateAsync(userId, new CreateTodoItemRequest(
            "Valid",
            "2026-11-24",
            ScheduledStartTime: "09:00",
            ScheduledEndTime: "10:30"));
        var updated = await service.UpdateAsync(userId, valid.Value!.Id, new UpdateTodoItemRequest
        {
            ScheduledEndTime = "11:00",
        });
        var cleared = await service.UpdateAsync(userId, valid.Value.Id, new UpdateTodoItemRequest
        {
            ScheduledStartTime = null,
            ScheduledEndTime = null,
        });

        Assert.False(invalid.IsSuccess);
        Assert.Equal(90, valid.Value.EstimatedMinutes);
        Assert.Equal(120, updated.Value!.EstimatedMinutes);
        Assert.Null(cleared.Value!.ScheduledStartTime);
        Assert.Null(cleared.Value.ScheduledEndTime);
        Assert.Null(cleared.Value.EstimatedMinutes);
    }

    [Fact]
    public async Task Subtasks_CrudAndOwnership_MarksGeneratedOccurrenceEdited()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var ownerId = Guid.NewGuid();
        var otherId = Guid.NewGuid();

        var parent = await service.CreateAsync(ownerId, new CreateTodoItemRequest("Daily", "2026-07-22", RepeatPattern: "Daily"));
        await service.UpdateAsync(ownerId, parent.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var generated = Assert.Single((await service.ListByDateAsync(ownerId, "2026-07-23")).Value!);

        var foreignAdd = await service.CreateSubtaskAsync(otherId, generated.Id, new CreateTodoSubtaskRequest("Hack"));
        var added = await service.CreateSubtaskAsync(ownerId, generated.Id, new CreateTodoSubtaskRequest("Step 1"));
        var toggled = await service.UpdateSubtaskAsync(ownerId, generated.Id, added.Value!.Id, new UpdateTodoSubtaskRequest(IsCompleted: true));
        var reopenedParent = await service.UpdateAsync(ownerId, parent.Value.Id, new UpdateTodoItemRequest(IsCompleted: false));
        var deleted = await service.DeleteSubtaskAsync(ownerId, generated.Id, added.Value.Id);
        var fetchedGenerated = await service.GetAsync(ownerId, generated.Id);

        Assert.False(foreignAdd.IsSuccess);
        Assert.True(toggled.Value!.IsCompleted);
        Assert.Equal("recurrence-next-retained", reopenedParent.Value!.WarningCode);
        Assert.True(deleted.Value);
        Assert.Empty(fetchedGenerated.Value!.Subtasks!);
    }

    private sealed class FakeTodoRepository : ITodoRepository
    {
        private readonly List<TodoItem> _items = [];
        private readonly List<TodoPriority> _priorities = [];
        private readonly List<TodoTag> _tags = [];
        private readonly List<TodoItemTag> _itemTags = [];
        private readonly List<TodoSubtask> _subtasks = [];

        public Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date == date.Date && item.DeletedAt is null)
                .OrderBy(item => item.IsCompleted)
                .ThenBy(item => item.SortOrder)
                .ThenBy(item => item.CompletedAt ?? item.CreatedAt)
                .Select(Hydrate)
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
                .Select(Hydrate)
                .ToList());
        }

        public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
        {
            var item = _items.FirstOrDefault(candidate => candidate.UserId == userId && candidate.Id == todoId && candidate.DeletedAt is null);
            return Task.FromResult(item is null ? null : Hydrate(item));
        }

        public Task<bool> SoftDeleteFutureOccurrencesAsync(Guid userId, Guid todoId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var root = _items.FirstOrDefault(item => item.UserId == userId && item.Id == todoId && item.DeletedAt is null);
            if (root is null) return Task.FromResult(false);
            var pending = new Queue<TodoItem>();
            pending.Enqueue(root);
            while (pending.TryDequeue(out var current))
            {
                if (current.Id == root.Id || current.Date >= root.Date) current.SoftDelete(nowUtc);
                foreach (var child in _items.Where(item => item.UserId == userId && item.GeneratedFromTodoId == current.Id && item.DeletedAt is null))
                    pending.Enqueue(child);
            }
            return Task.FromResult(true);
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

        public Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default) => Task.CompletedTask;

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
                return Task.FromResult<TodoCompletionMutationResult?>(new TodoCompletionMutationResult(Hydrate(item), false));
            }

            var retained = false;
            if (isCompleted)
            {
                item.MarkGeneratedOccurrenceEdited();
                item.SetCompleted(true, nowUtc);
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
                    _items.Add(child);

                    foreach (var link in _itemTags.Where(link => link.TodoItemId == item.Id).ToList())
                    {
                        _itemTags.Add(new TodoItemTag(child.Id, link.TagId));
                    }

                    var subtasks = _subtasks
                        .Where(subtask => subtask.TodoItemId == item.Id && subtask.DeletedAt is null)
                        .OrderBy(subtask => subtask.SortOrder)
                        .ThenBy(subtask => subtask.CreatedAt)
                        .ToList();
                    for (var index = 0; index < subtasks.Count; index++)
                    {
                        _subtasks.Add(TodoSubtask.Create(child.Id, subtasks[index].Title, index, isCompleted: false));
                    }
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

            return Task.FromResult<TodoCompletionMutationResult?>(new TodoCompletionMutationResult(Hydrate(item), retained));
        }

        public Task<IReadOnlyList<TodoPriority>> ListPrioritiesAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoPriority>>(_priorities
                .Where(priority => priority.UserId == userId && priority.DeletedAt is null)
                .OrderBy(priority => priority.SortOrder)
                .ToList());
        }

        public Task<TodoPriority?> GetPriorityAsync(Guid userId, Guid priorityId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_priorities.FirstOrDefault(priority => priority.UserId == userId && priority.Id == priorityId && priority.DeletedAt is null));
        }

        public Task<bool> PriorityNameExistsAsync(Guid userId, string normalizedName, Guid? excludePriorityId = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_priorities.Any(priority => priority.UserId == userId
                && priority.DeletedAt is null
                && priority.NormalizedName == normalizedName
                && (!excludePriorityId.HasValue || priority.Id != excludePriorityId.Value)));
        }

        public Task<int> NextPrioritySortOrderAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            var next = _priorities.Where(p => p.UserId == userId && p.DeletedAt is null).Select(p => p.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            return Task.FromResult(next);
        }

        public Task AddPriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default)
        {
            _priorities.Add(priority);
            return Task.CompletedTask;
        }

        public Task UpdatePriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<bool> SoftDeletePriorityAsync(Guid userId, Guid priorityId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var priority = _priorities.FirstOrDefault(p => p.UserId == userId && p.Id == priorityId && p.DeletedAt is null);
            if (priority is null) return Task.FromResult(false);
            priority.SoftDelete(nowUtc);
            foreach (var item in _items.Where(item => item.UserId == userId && item.PriorityId == priorityId && item.DeletedAt is null))
            {
                item.SetPriority(null);
            }
            return Task.FromResult(true);
        }

        public Task<IReadOnlyList<TodoTag>> ListTagsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoTag>>(_tags
                .Where(tag => tag.UserId == userId && tag.DeletedAt is null)
                .OrderBy(tag => tag.Name)
                .ToList());
        }

        public Task<TodoTag?> GetTagAsync(Guid userId, Guid tagId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_tags.FirstOrDefault(tag => tag.UserId == userId && tag.Id == tagId && tag.DeletedAt is null));
        }

        public Task<IReadOnlyList<TodoTag>> GetTagsByIdsAsync(Guid userId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoTag>>(_tags
                .Where(tag => tag.UserId == userId && tag.DeletedAt is null && tagIds.Contains(tag.Id))
                .ToList());
        }

        public Task<bool> TagNameExistsAsync(Guid userId, string normalizedName, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_tags.Any(tag => tag.UserId == userId && tag.DeletedAt is null && tag.NormalizedName == normalizedName));
        }

        public Task AddTagAsync(TodoTag tag, CancellationToken cancellationToken = default)
        {
            _tags.Add(tag);
            return Task.CompletedTask;
        }

        public Task<bool> SoftDeleteTagAsync(Guid userId, Guid tagId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var tag = _tags.FirstOrDefault(t => t.UserId == userId && t.Id == tagId && t.DeletedAt is null);
            if (tag is null) return Task.FromResult(false);
            tag.SoftDelete(nowUtc);
            _itemTags.RemoveAll(link => link.TagId == tagId);
            return Task.FromResult(true);
        }

        public Task ReplaceItemTagsAsync(Guid todoItemId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default)
        {
            _itemTags.RemoveAll(link => link.TodoItemId == todoItemId);
            foreach (var tagId in tagIds.Distinct())
            {
                _itemTags.Add(new TodoItemTag(todoItemId, tagId));
            }
            return Task.CompletedTask;
        }

        public Task<TodoSubtask?> GetSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, CancellationToken cancellationToken = default)
        {
            var ownsTodo = _items.Any(item => item.Id == todoId && item.UserId == userId && item.DeletedAt is null);
            if (!ownsTodo) return Task.FromResult<TodoSubtask?>(null);
            return Task.FromResult(_subtasks.FirstOrDefault(s => s.TodoItemId == todoId && s.Id == subtaskId && s.DeletedAt is null));
        }

        public Task<int> NextSubtaskSortOrderAsync(Guid todoId, CancellationToken cancellationToken = default)
        {
            var next = _subtasks.Where(s => s.TodoItemId == todoId && s.DeletedAt is null).Select(s => s.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            return Task.FromResult(next);
        }

        public Task AddSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default)
        {
            _subtasks.Add(subtask);
            return Task.CompletedTask;
        }

        public Task AddSubtasksAsync(IReadOnlyList<TodoSubtask> subtasks, CancellationToken cancellationToken = default)
        {
            _subtasks.AddRange(subtasks);
            return Task.CompletedTask;
        }

        public Task UpdateSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<bool> SoftDeleteSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var subtask = _subtasks.FirstOrDefault(s => s.TodoItemId == todoId && s.Id == subtaskId && s.DeletedAt is null);
            if (subtask is null) return Task.FromResult(false);
            subtask.SoftDelete(nowUtc);
            return Task.FromResult(true);
        }

        private TodoItem Hydrate(TodoItem item)
        {
            var priority = item.PriorityId.HasValue
                ? _priorities.FirstOrDefault(p => p.Id == item.PriorityId && p.DeletedAt is null)
                : null;
            typeof(TodoItem).GetProperty(nameof(TodoItem.Priority))!.SetValue(item, priority);

            var linksField = typeof(TodoItem).GetField("_todoItemTags", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var linksList = (List<TodoItemTag>)linksField.GetValue(item)!;
            linksList.Clear();
            foreach (var link in _itemTags.Where(l => l.TodoItemId == item.Id))
            {
                var tag = _tags.FirstOrDefault(t => t.Id == link.TagId && t.DeletedAt is null);
                if (tag is not null)
                {
                    linksList.Add(new TodoItemTag(item.Id, tag.Id, tag));
                }
            }

            var subtasksField = typeof(TodoItem).GetField("_subtasks", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var subtasksList = (List<TodoSubtask>)subtasksField.GetValue(item)!;
            subtasksList.Clear();
            subtasksList.AddRange(_subtasks.Where(s => s.TodoItemId == item.Id && s.DeletedAt is null));

            return item;
        }
    }
}
