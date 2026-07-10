namespace FluentA.Application.BoundedContexts.Note.DTOs;

public sealed record CreateNoteBoardRequest(string Name);

public sealed record UpdateNoteBoardRequest(string Name);

public sealed record CreateNotePageRequest(string Name);

public sealed record UpdateNotePageRequest(string? Name = null, string? Content = null);

public sealed record NotePageSummaryDto(
    Guid Id,
    Guid BoardId,
    string Name,
    string Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record NoteBoardSummaryDto(
    Guid Id,
    string Name,
    IReadOnlyList<NotePageSummaryDto> Pages,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record NotePageDto(
    Guid Id,
    Guid BoardId,
    string Name,
    string Content,
    string Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);
