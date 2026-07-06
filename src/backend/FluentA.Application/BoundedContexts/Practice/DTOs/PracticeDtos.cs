namespace FluentA.Application.BoundedContexts.Practice.DTOs;

public sealed record CreatePracticeSessionSummaryRequest(
    Guid DeckId,
    string Mode,
    int TotalCards,
    int CorrectCards,
    int WrongCards,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewRequest(
    Guid DeckId,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewDto(
    Guid DeckId,
    int AddedWordCount,
    DateTime NextReviewDate);

public sealed record PracticeSessionSummaryDto(
    Guid Id,
    Guid UserId,
    Guid DeckId,
    string Mode,
    int TotalCards,
    int CorrectCards,
    int WrongCards,
    DateTime CompletedAt);

public sealed record PracticeSettingsDto(IReadOnlyList<string> ModeSequence);

public sealed record UpdatePracticeSettingsRequest(IReadOnlyList<string> ModeSequence);

public enum PracticeSessionSummarySaveStatus
{
    Success = 0,
    DeckNotFound = 1,
    InconsistentSummary = 2,
}

public sealed record PracticeSessionSummarySaveResult(
    PracticeSessionSummarySaveStatus Status,
    PracticeSessionSummaryDto? Summary);
