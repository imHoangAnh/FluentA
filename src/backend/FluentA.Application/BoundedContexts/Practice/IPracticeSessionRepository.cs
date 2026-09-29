using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Domain.BoundedContexts.Practice.Entities;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IPracticeSessionRepository
{
    Task<PracticeDeckQueryResult> GetDecksAsync(
        Guid userId,
        Guid boardId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CreateSessionAsync(
        Guid userId,
        Guid pageId,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeAnswerResultDto>> SubmitAnswerAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PracticeStep submittedStep,
        string? answerText,
        Guid? answerSlotId,
        bool skip,
        long durationMs,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticePronunciationTargetDto>> GetPronunciationTargetAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticePronunciationAttemptResultDto>> RecordPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PronunciationAssessmentDto assessment,
        long durationMs,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeReviewEnrollmentContextDto>> GetReviewEnrollmentContextAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeReviewLevelResultDto>> AdvanceAfterReviewEnrollmentAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        int selectedLevel,
        bool alreadyActive,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<PracticeRepositoryOperationResult<PracticeSessionDto>> CompleteSessionAsync(
        Guid userId,
        Guid sessionId,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
}
