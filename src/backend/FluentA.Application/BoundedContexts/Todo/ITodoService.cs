using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Todo;

public interface ITodoService
{
    /// <summary>Lists todo items for one date.</summary>
    Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByDateAsync(Guid userId, string date, CancellationToken cancellationToken = default);
    /// <summary>Lists todo items for an inclusive date range.</summary>
    Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByRangeAsync(Guid userId, string startDate, string endDate, CancellationToken cancellationToken = default);
    /// <summary>Gets one owned, active todo item without disclosing foreign ownership.</summary>
    Task<OperationResult<TodoItemDto>> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    /// <summary>Creates a todo item for the authenticated user.</summary>
    Task<OperationResult<TodoItemDto>> CreateAsync(Guid userId, CreateTodoItemRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates supplied fields on an owned todo item.</summary>
    Task<OperationResult<TodoItemDto>> UpdateAsync(Guid userId, Guid todoId, UpdateTodoItemRequest request, CancellationToken cancellationToken = default);
    /// <summary>Creates one incomplete same-day copy from an owned todo item.</summary>
    Task<OperationResult<TodoItemDto>> DuplicateAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes an owned todo and its already-created future occurrences.</summary>
    Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);

    Task<OperationResult<IReadOnlyList<TodoPriorityDto>>> ListPrioritiesAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<TodoPriorityDto>> CreatePriorityAsync(Guid userId, CreateTodoPriorityRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<TodoPriorityDto>> UpdatePriorityAsync(Guid userId, Guid priorityId, UpdateTodoPriorityRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeletePriorityAsync(Guid userId, Guid priorityId, CancellationToken cancellationToken = default);

    Task<OperationResult<IReadOnlyList<TodoTagDto>>> ListTagsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<TodoTagDto>> CreateTagAsync(Guid userId, CreateTodoTagRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteTagAsync(Guid userId, Guid tagId, CancellationToken cancellationToken = default);

    Task<OperationResult<TodoSubtaskDto>> CreateSubtaskAsync(Guid userId, Guid todoId, CreateTodoSubtaskRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<TodoSubtaskDto>> UpdateSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, UpdateTodoSubtaskRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteSubtaskAsync(Guid userId, Guid todoId, Guid subtaskId, CancellationToken cancellationToken = default);
}
