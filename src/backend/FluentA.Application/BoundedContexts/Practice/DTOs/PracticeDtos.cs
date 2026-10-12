using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.Common.Models;

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
    string PageName,
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
    bool IsCompleted,
    int AttemptCount = 0,
    int PronunciationAttemptCount = 0,
    PracticeSavedAttemptDto? LastAttempt = null);

public sealed record PracticeSavedAttemptDto(Guid RequestId, string Step, bool Correctness,
    bool IsSkip, int? AttemptNumber, PronunciationAssessmentDto? Assessment);

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
    long DurationMs = 0,
    Guid? RequestId = null);

public sealed record PracticeAnswerResultDto(
    Guid ItemId,
    string Step,
    bool Correctness,
    bool CanRetry,
    string? NextStep,
    int CurrentItemIndex,
    string Status);

public sealed record RetryPracticeStepRequest(Guid ItemId, string Step, Guid AttemptId);

public sealed record PracticeRetryStepResultDto(Guid ItemId, string Step);

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

public sealed record PracticeReviewEnrollmentContextDto(Guid PageId, Guid WordId, PracticeReviewLevelResultDto? CompletedResult = null);

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
    PagedResult<PracticeDeckDto>? Page);

public sealed record PracticeRepositoryOperationResult<T>(
    PracticeRepositoryOperationStatus Status,
    T? Value);
