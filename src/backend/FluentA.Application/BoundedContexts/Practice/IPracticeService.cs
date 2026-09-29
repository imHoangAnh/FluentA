using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Practice;

public interface IPracticeService
{
    Task<OperationResult<PracticeDeckPageDto>> GetDecksAsync(
        Guid userId,
        Guid boardId,
        string? search,
        int page,
        int pageSize,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeSessionDto>> CreateSessionAsync(
        Guid userId,
        CreatePracticeSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeAnswerResultDto>> SubmitAnswerAsync(
        Guid userId,
        Guid sessionId,
        SubmitPracticeAnswerRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticePronunciationAttemptResultDto>> SubmitPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        ReadOnlyMemory<byte> wavAudio,
        long durationMs,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeReviewLevelResultDto>> SetReviewLevelAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        SetPracticeReviewLevelRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<PracticeSessionDto>> CompleteSessionAsync(
        Guid userId,
        Guid sessionId,
        CompletePracticeSessionRequest request,
        CancellationToken cancellationToken = default);

    // Retained for existing internal callers; no public endpoint accepts client summaries.
    Task<OperationResult<PracticeSessionSummaryDto>> CreatePracticeSessionSummaryAsync(
        Guid userId,
        CreatePracticeSessionSummaryRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<AddPracticeWordsToReviewDto>> AddPracticeWordsToReviewAsync(
        Guid userId,
        AddPracticeWordsToReviewRequest request,
        CancellationToken cancellationToken = default);

}
