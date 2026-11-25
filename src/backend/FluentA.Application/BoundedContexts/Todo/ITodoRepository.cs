using FluentA.Domain.BoundedContexts.Todo.Entities;

namespace FluentA.Application.BoundedContexts.Todo;

public interface ITodoRepository
{
    Task<IReadOnlyList<TodoItem>> ListByDateAsync(Guid userId, DateTime date, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TodoItem>> ListByRangeAsync(Guid userId, DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    Task<TodoItem?> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteFutureOccurrencesAsync(Guid userId, Guid todoId, DateTime nowUtc, CancellationToken cancellationToken = default);
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

    Task<IReadOnlyList<TodoPriority>> ListPrioritiesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<TodoPriority?> GetPriorityAsync(Guid userId, Guid priorityId, CancellationToken cancellationToken = default);
    Task<bool> PriorityNameExistsAsync(Guid userId, string normalizedName, Guid? excludePriorityId = null, CancellationToken cancellationToken = default);
    Task<int> NextPrioritySortOrderAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddPriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default);
    Task UpdatePriorityAsync(TodoPriority priority, CancellationToken cancellationToken = default);
    Task<bool> SoftDeletePriorityAsync(Guid userId, Guid priorityId, DateTime nowUtc, CancellationToken cancellationToken = default);

    Task<IReadOnlyList<TodoTag>> ListTagsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<TodoTag?> GetTagAsync(Guid userId, Guid tagId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TodoTag>> GetTagsByIdsAsync(Guid userId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default);
    Task<bool> TagNameExistsAsync(Guid userId, string normalizedName, CancellationToken cancellationToken = default);
    Task AddTagAsync(TodoTag tag, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteTagAsync(Guid userId, Guid tagId, DateTime nowUtc, CancellationToken cancellationToken = default);
    Task ReplaceItemTagsAsync(Guid todoItemId, IReadOnlyList<Guid> tagIds, CancellationToken cancellationToken = default);

    Task<TodoSubtask?> GetSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, CancellationToken cancellationToken = default);
    Task<int> NextSubtaskSortOrderAsync(Guid todoId, CancellationToken cancellationToken = default);
    Task AddSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default);
    Task AddSubtasksAsync(IReadOnlyList<TodoSubtask> subtasks, CancellationToken cancellationToken = default);
    Task UpdateSubtaskAsync(TodoSubtask subtask, CancellationToken cancellationToken = default);
    Task<bool> SoftDeleteSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, DateTime nowUtc, CancellationToken cancellationToken = default);
}

public sealed record TodoCompletionMutationResult(TodoItem Item, bool NextOccurrenceRetained);
