using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review.DTOs;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewRepository
{
    Task<AddPracticeWordsToReviewDto?> StagePracticeWordEnrollmentAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default) =>
        throw new NotSupportedException("Review repository must support staged enrollment.");

    // Practice still uses this enrollment contract; keep both overloads stable.
    Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default) =>
        AddPracticeWordsToReviewAsync(userId, pageId, wordId, utcNow, cancellationToken);

    Task<ReviewSessionDto> CreateReviewSessionAsync(
        Guid userId,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<ReviewDashboardDto> GetDashboardAsync(
        Guid userId,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<ReviewSessionDto?> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<ReviewAnswerTargetDto?> GetAnswerTargetAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        CancellationToken cancellationToken = default);

    Task<ReviewAnswerResultDto?> SubmitTypedAnswerAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        string answerText,
        bool correct,
        int timeSpentSeconds,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
}
