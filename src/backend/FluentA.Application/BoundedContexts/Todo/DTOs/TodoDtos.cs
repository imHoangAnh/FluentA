namespace FluentA.Application.BoundedContexts.Todo.DTOs;

public sealed record CreateTodoItemRequest(string Title, string Date, string? Note = null);

public sealed record UpdateTodoItemRequest(
    string? Title = null,
    string? Note = null,
    bool? IsCompleted = null);

public sealed record TodoItemDto(
    Guid Id,
    string Title,
    string? Note,
    string Date,
    bool IsCompleted,
    DateTime? CompletedAt,
    DateTime CreatedAt,
    DateTime UpdatedAt);
