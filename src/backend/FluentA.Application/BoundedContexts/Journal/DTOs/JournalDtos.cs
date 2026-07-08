namespace FluentA.Application.BoundedContexts.Journal.DTOs;

public sealed record CreateJournalEntryRequest(string Title, string Date, string? Content = null);

public sealed record UpdateJournalEntryRequest(
    string? Title = null,
    string? Content = null,
    string? Date = null);

public sealed record JournalEntryDto(
    Guid Id,
    string Title,
    string Content,
    string Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalEntrySummaryDto(
    Guid Id,
    string Title,
    string Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalHighlightRangeDto(int Start, int Length);

public sealed record JournalSearchResultDto(
    Guid Id,
    string Title,
    IReadOnlyList<JournalHighlightRangeDto> Highlights,
    string Date,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalCalendarDayDto(string Date, int Count);
