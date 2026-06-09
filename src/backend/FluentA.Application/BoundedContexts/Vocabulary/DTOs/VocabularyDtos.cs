namespace FluentA.Application.BoundedContexts.Vocabulary.DTOs;

public sealed record CreateBoardRequest(string Name, string Language);

public sealed record UpdateBoardRequest(string Name, string Language, int? SortOrder = null);

public sealed record BoardSummaryDto(
    Guid Id,
    string Name,
    string Language,
    int SortOrder,
    int PageCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record BoardDetailDto(
    Guid Id,
    string Name,
    string Language,
    int SortOrder,
    IReadOnlyList<PageDto> Pages,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreatePageRequest(string Name, int? SortOrder = null);

public sealed record UpdatePageRequest(string Name, int? SortOrder = null);

public sealed record PageDto(Guid Id, Guid BoardId, string Name, int SortOrder, DateTime CreatedAt, DateTime UpdatedAt);
