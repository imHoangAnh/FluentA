using FluentA.Application.BoundedContexts.Todo.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Todo;

public interface ITodoService
{
    /// <summary>Lists todo items for one date after applying carry-over.</summary>
    Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByDateAsync(Guid userId, string date, CancellationToken cancellationToken = default);
    /// <summary>Lists todo items for an inclusive date range after applying carry-over.</summary>
    Task<OperationResult<IReadOnlyList<TodoItemDto>>> ListByRangeAsync(Guid userId, string startDate, string endDate, CancellationToken cancellationToken = default);
    /// <summary>Gets one owned, active todo item without disclosing foreign ownership.</summary>
    Task<OperationResult<TodoItemDto>> GetAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    /// <summary>Creates a todo item for the authenticated user.</summary>
    Task<OperationResult<TodoItemDto>> CreateAsync(Guid userId, CreateTodoItemRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates supplied fields on an owned todo item.</summary>
    Task<OperationResult<TodoItemDto>> UpdateAsync(Guid userId, Guid todoId, UpdateTodoItemRequest request, CancellationToken cancellationToken = default);
    /// <summary>Creates one incomplete same-day copy from an owned todo item.</summary>
    Task<OperationResult<TodoItemDto>> DuplicateAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned todo item and its already-created future occurrences to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteAsync(Guid userId, Guid todoId, CancellationToken cancellationToken = default);
}
