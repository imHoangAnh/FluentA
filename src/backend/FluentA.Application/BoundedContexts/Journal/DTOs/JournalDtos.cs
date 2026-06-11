namespace FluentA.Application.BoundedContexts.Journal.DTOs;

public sealed record CreateJournalEntryRequest(string Title, string? Content = null, string? LearningDate = null);

public sealed record UpdateJournalEntryRequest(
    string? Title = null,
    string? Content = null,
    string? LearningDate = null);

public sealed record JournalEntryDto(
    Guid Id,
    string Title,
    string Content,
    string Preview,
    string? LearningDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);

public sealed record JournalEntrySummaryDto(
    Guid Id,
    string Title,
    string Preview,
    string? LearningDate,
    DateTime CreatedAt,
    DateTime UpdatedAt);
