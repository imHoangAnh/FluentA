namespace FluentA.Application.BoundedContexts.Todo.DTOs;

public sealed record CreateTodoItemRequest(
    string Title,
    string Date,
    string? Note = null,
    bool IsImportant = false);

public sealed record UpdateTodoItemRequest(
    string? Title = null,
    string? Note = null,
    bool? IsCompleted = null,
    bool? IsImportant = null,
    string? Date = null,
    int? SortOrder = null);

public sealed record TodoItemDto(
    Guid Id,
    string Title,
    string? Note,
    string Date,
    int SortOrder,
    bool IsCompleted,
    bool IsImportant,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);
