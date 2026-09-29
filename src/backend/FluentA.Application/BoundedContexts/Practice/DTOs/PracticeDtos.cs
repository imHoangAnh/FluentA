using FluentA.Application.BoundedContexts.Pronunciation.DTOs;

namespace FluentA.Application.BoundedContexts.Practice.DTOs;

// Retained for internal callers and historical summary tooling. The public
// session-completion endpoint now derives these values from the persisted run.
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
    string TimeZoneId,
    int InitialLevel = 0);

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

public enum PracticeSessionSummarySaveStatus
{
    Success = 0,
    PageNotFound = 1,
    InconsistentSummary = 2,
}

public sealed record PracticeSessionSummarySaveResult(
    PracticeSessionSummarySaveStatus Status,
    PracticeSessionSummaryDto? Summary);

public sealed record CreatePracticeSessionRequest(Guid PageId);

public sealed record PracticeDeckDto(
    Guid PageId,
    string PageName,
    Guid BoardId,
    string BoardName,
    int WordCount);

public sealed record PracticeDeckPageDto(
    IReadOnlyList<PracticeDeckDto> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record PracticeAnswerSlotDto(Guid SlotId, string? Meaning);

public sealed record PracticeSessionItemDto(
    Guid ItemId,
    Guid WordId,
    int Position,
    string Word,
    string Meaning,
    string IpaPronunciation,
    string Type,
    string? Context,
    string Example,
    string? Synonyms,
    string? Antonyms,
    string CurrentStep,
    bool AlreadyInReview,
    IReadOnlyList<PracticeAnswerSlotDto> AnswerSlots,
    int? SelectedLevel,
    bool IsCompleted);

public sealed record PracticeSessionDto(
    Guid SessionId,
    Guid PageId,
    string PageName,
    Guid BoardId,
    string BoardName,
    string BoardLanguage,
    string Status,
    int CurrentItemIndex,
    IReadOnlyList<PracticeSessionItemDto> Items,
    DateTime StartedAt,
    DateTime? CompletedAt);

public sealed record SubmitPracticeAnswerRequest(
    Guid ItemId,
    string Step,
    string? AnswerText = null,
    Guid? AnswerSlotId = null,
    bool Skip = false,
    long DurationMs = 0);

public sealed record PracticeAnswerResultDto(
    Guid ItemId,
    string Step,
    bool Correctness,
    bool CanRetry,
    string? NextStep,
    int CurrentItemIndex,
    string Status);

public sealed record PracticePronunciationAttemptResultDto(
    Guid ItemId,
    PronunciationAssessmentDto Assessment,
    bool IsCorrect,
    int AttemptNumber,
    int? AttemptsRemaining,
    string? NextStep,
    int CurrentItemIndex,
    string Status);

public sealed record PracticePronunciationTargetDto(string Word, string Language, int NextAttemptNumber);

public sealed record SetPracticeReviewLevelRequest(int Level, string TimeZoneId);

public sealed record PracticeReviewEnrollmentContextDto(Guid PageId, Guid WordId);

public sealed record PracticeReviewLevelResultDto(
    string Status,
    bool ItemCompleted,
    int CurrentItemIndex);

public sealed record CompletePracticeSessionRequest(string TimeZoneId);

public enum PracticeRepositoryOperationStatus
{
    Success = 0,
    NotFound = 1,
    EmptyDeck = 2,
    Conflict = 3,
}

public sealed record PracticeDeckQueryResult(
    PracticeRepositoryOperationStatus Status,
    PracticeDeckPageDto? Page);

public sealed record PracticeRepositoryOperationResult<T>(
    PracticeRepositoryOperationStatus Status,
    T? Value);
