using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.BoundedContexts.Todo;

public interface ITodoRepository
{
    Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    Task<int> NextSortOrderAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default);
    Task AddAsync(TodoItem item, CancellationToken cancellationToken = default);
    Task UpdateAsync(TodoItem item, CancellationToken cancellationToken = default);
    Task UpdateRangeAsync(IReadOnlyList<TodoItem> items, CancellationToken cancellationToken = default);
    Task<TodoCompletionMutationResult?> SetCompletionAsync(
        Guid userId,
        Guid todoId,
        bool isCompleted,
        DateTime nowUtc,
        CancellationToken cancellationToken = default);
}

public sealed record TodoCompletionMutationResult(TodoItem Item, bool NextOccurrenceRetained);
