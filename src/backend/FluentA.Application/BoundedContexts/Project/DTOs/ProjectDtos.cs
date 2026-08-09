namespace FluentA.Application.BoundedContexts.Project.DTOs;

public sealed record ProjectBoardSummaryDto(Guid Id, string Name, int ColumnCount, int CardCount, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ProjectBoardDetailDto(Guid Id, string Name, IReadOnlyList<ProjectColumnDto> Columns, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ProjectColumnDto(Guid Id, string Name, int SortOrder, IReadOnlyList<ProjectCardDto> Cards, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record ProjectCardDto(
    Guid Id,
    Guid ColumnId,
    string Title,
    string? Description,
    string Priority,
    string? Deadline,
    int SortOrder,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreateProjectBoardRequest(string Name);

public sealed record UpdateProjectBoardRequest(string? Name = null);

public sealed record CreateProjectColumnRequest(string Name);

public sealed record UpdateProjectColumnRequest(string? Name = null, int? SortOrder = null);

public sealed record CreateProjectCardRequest(
    Guid ColumnId,
    string Title,
    string? Description = null,
    string? Priority = null,
    string? Deadline = null);

public sealed record UpdateProjectCardRequest(
    string? Title = null,
    string? Description = null,
    string? Priority = null,
    string? Deadline = null);

public sealed record MoveProjectCardRequest(Guid ColumnId, int SortOrder);
