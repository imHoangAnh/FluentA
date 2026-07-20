namespace FluentA.Application.BoundedContexts.Practice.DTOs;

public sealed record CreatePracticeSessionSummaryRequest(
    Guid PageId,
    string Mode,
    int TotalCards,
    int CorrectCards,
    int WrongCards,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewRequest(
    Guid PageId,
    Guid WordId,
    string TimeZoneId);

public sealed record AddPracticeWordsToReviewDto(
    Guid PageId,
    Guid WordId,
    string Status,
    DateOnly NextReviewDate);

public sealed record PracticeSessionSummaryDto(
    Guid Id,
    Guid UserId,
    Guid PageId,
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
    PageNotFound = 1,
    InconsistentSummary = 2,
}

public sealed record PracticeSessionSummarySaveResult(
    PracticeSessionSummarySaveStatus Status,
    PracticeSessionSummaryDto? Summary);
