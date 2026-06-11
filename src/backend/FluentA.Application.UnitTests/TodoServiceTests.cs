using FluentA.Application.BoundedContexts.Todo;
using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.UnitTests;

public sealed class TodoServiceTests
{
    [Fact]
    public async Task CreateListUpdateAndDelete_UseOwnedItems()
    {
        var repository = new FakeTodoRepository();
        var notifier = new RecordingTodoSyncNotifier();
        var service = new TodoService(repository, notifier);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");

        var created = await service.CreateAsync(userId, new CreateTodoItemRequest(" Review IELTS ", date, " Unit 3 "));
        var listed = await service.ListByDateAsync(userId, date);
        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));
        var deleted = await service.DeleteAsync(userId, created.Value.Id);
        var afterDelete = await service.ListByDateAsync(userId, date);

        Assert.True(created.IsSuccess);
        Assert.Equal("Review IELTS", created.Value.Title);
        Assert.Equal("Unit 3", created.Value.Note);
        Assert.Single(listed.Value!);
        Assert.True(updated.Value!.IsCompleted);
        Assert.NotNull(updated.Value.CompletedAt);
        Assert.Single(notifier.CheckedItems);
        Assert.Equal(created.Value.Id, notifier.CheckedItems[0].TodoId);
        Assert.True(deleted.Value);
        Assert.Empty(afterDelete.Value!);
    }

    [Fact]
    public async Task ListByDate_CarriesOverIncompletePastTasksOnce()
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

        var carried = Assert.Single(first.Value!);
        Assert.Equal(incomplete.Value!.Id, carried.Id);
        Assert.True(carried.IsCarriedOver);
        Assert.Equal(yesterday, carried.OriginalDate);
        Assert.Single(second.Value!);
        Assert.Equal(1, repository.RangeUpdateCount);
    }

    [Fact]
    public async Task Update_AppliesOnlySuppliedFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Task", date, "keep"));

        var updated = await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(Title: "Renamed"));

        Assert.Equal("Renamed", updated.Value!.Title);
        Assert.Equal("keep", updated.Value.Note);
        Assert.Equal(date, updated.Value.Date);
        Assert.False(updated.Value.IsCompleted);
    }

    [Fact]
    public async Task Update_DateAndSortOrder_PreserveUnrelatedFields()
    {
        var repository = new FakeTodoRepository();
        var service = new TodoService(repository);
        var userId = Guid.NewGuid();
        var date = DateTime.UtcNow.Date.ToString("yyyy-MM-dd");
        var nextDate = DateTime.UtcNow.Date.AddDays(1).ToString("yyyy-MM-dd");
        var created = await service.CreateAsync(userId, new CreateTodoItemRequest("Task", date, "keep"));
        await service.UpdateAsync(userId, created.Value!.Id, new UpdateTodoItemRequest(IsCompleted: true));

        var updated = await service.UpdateAsync(userId, created.Value.Id, new UpdateTodoItemRequest(Date: nextDate, SortOrder: 4));

        Assert.True(updated.IsSuccess);
        Assert.Equal("Task", updated.Value!.Title);
        Assert.Equal("keep", updated.Value.Note);
        Assert.Equal(nextDate, updated.Value.Date);
        Assert.Equal(4, updated.Value.SortOrder);
        Assert.True(updated.Value.IsCompleted);
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
    public async Task InvalidInputs_ReturnValidationErrorsAndDoNotNotify()
    {
        var notifier = new RecordingTodoSyncNotifier();
        var service = new TodoService(new FakeTodoRepository(), notifier);

        var created = await service.CreateAsync(Guid.NewGuid(), new CreateTodoItemRequest("", "not-a-date"));

        Assert.False(created.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((TodoError)created.Error!).Code);
        Assert.Empty(notifier.CheckedItems);
    }

    private sealed class FakeTodoRepository : ITodoRepository
    {
        private readonly List<TodoItem> _items = [];

        public int RangeUpdateCount { get; private set; }

        public Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date == date.Date && item.DeletedAt is null)
                .OrderBy(item => item.SortOrder)
                .ToList());
        }

        public Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date >= startDate.Date && item.Date <= endDate.Date && item.DeletedAt is null)
                .OrderBy(item => item.Date)
                .ThenBy(item => item.SortOrder)
                .ToList());
        }

        public Task<IReadOnlyList<TodoItem>> ListCarryOverCandidatesAsync(Guid userId, DateTime today, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<TodoItem>>(_items
                .Where(item => item.UserId == userId && item.Date < today.Date && !item.IsCompleted && item.DeletedAt is null)
                .ToList());
        }

        public Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.FirstOrDefault(item => item.UserId == userId && item.Id == todoId && item.DeletedAt is null));
        }

        public Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_items.Count(item => item.UserId == userId && item.Date == date.Date && item.DeletedAt is null));
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

        public Task UpdateRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default)
        {
            RangeUpdateCount++;
            return Task.CompletedTask;
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
