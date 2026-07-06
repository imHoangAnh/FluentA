namespace FluentA.Application.BoundedContexts.Vocabulary.DTOs;

public sealed record CreateBoardRequest(string Name, string Language);

public sealed record UpdateBoardRequest(string Name, string Language);

public sealed record BoardSummaryDto(
    Guid Id,
    string Name,
    string Language,
    int PageCount,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record BoardDetailDto(
    Guid Id,
    string Name,
    string Language,
    IReadOnlyList<PageDto> Pages,
    BoardPreferencesDto Preferences,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record CreatePageRequest(string Name);

public sealed record UpdatePageRequest(string Name);

public sealed record PageDto(Guid Id, Guid BoardId, string Name, DateTime CreatedAt, DateTime UpdatedAt);

public sealed record WordRequest(
    string Word,
    string MeaningVn,
    string IpaPronunciation,
    string Class,
    string? Definition,
    string Example,
    string? Note = null,
    string? Synonyms = null,
    string? Antonyms = null);

public sealed record UpdateWordCellRequest(string ColumnKey, string? Value);

public sealed record WordDto(
    Guid Id,
    Guid PageId,
    string Word,
    string MeaningVn,
    string IpaPronunciation,
    string Class,
    string? Definition,
    string Example,
    string? Note,
    string? Synonyms,
    string? Antonyms,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record BoardPreferencesDto(
    Guid? Id,
    IReadOnlyList<string> HiddenColumns,
    IReadOnlyList<string> ColumnOrder,
    IReadOnlyDictionary<string, int> ColumnWidths,
    DateTime? CreatedAt,
    DateTime? UpdatedAt);

public sealed record UpdateBoardPreferencesRequest(
    IReadOnlyList<string> HiddenColumns,
    IReadOnlyList<string> ColumnOrder,
    IReadOnlyDictionary<string, int> ColumnWidths);
