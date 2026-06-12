namespace FluentA.Application.BoundedContexts.Kanban.DTOs;

public sealed record KanbanBoardSummaryDto(Guid Id, string Name, int ColumnCount, int CardCount, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record KanbanBoardDetailDto(Guid Id, string Name, IReadOnlyList<KanbanColumnDto> Columns, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record KanbanColumnDto(Guid Id, string Name, int SortOrder, IReadOnlyList<KanbanCardDto> Cards, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record KanbanCardDto(
    Guid Id,
    Guid ColumnId,
    string Title,
    string? Description,
    string Priority,
    string? Deadline,
    int SortOrder,
    IReadOnlyList<string> Tags,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateKanbanBoardRequest(string Name);

public sealed record CreateKanbanColumnRequest(string Name);

public sealed record UpdateKanbanColumnRequest(string? Name = null, int? SortOrder = null);

public sealed record CreateKanbanCardRequest(
    Guid ColumnId,
    string Title,
    string? Description = null,
    string? Priority = null,
    string? Deadline = null,
    IReadOnlyList<string>? Tags = null);

public sealed record UpdateKanbanCardRequest(
    string? Title = null,
    string? Description = null,
    string? Priority = null,
    string? Deadline = null,
    IReadOnlyList<string>? Tags = null);

public sealed record MoveKanbanCardRequest(Guid ColumnId, int SortOrder);
