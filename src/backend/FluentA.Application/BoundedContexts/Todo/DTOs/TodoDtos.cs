namespace FluentA.Application.BoundedContexts.Todo.DTOs;

public sealed record CreateTodoItemRequest(string Title, string Date, string? Note = null);

public sealed record UpdateTodoItemRequest(
    string? Title = null,
    string? Date = null,
    string? Note = null,
    bool? IsCompleted = null,
    int? SortOrder = null);

public sealed record TodoItemDto(
    Guid Id,
    string Title,
    string? Note,
    string Date,
    bool IsCompleted,
    DateTime? CompletedAt,
    int SortOrder,
    bool IsCarriedOver,
    string? OriginalDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);
