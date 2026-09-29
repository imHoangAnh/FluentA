using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review.DTOs;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewRepository
{
    // Practice still uses this enrollment contract; keep both overloads stable.
    Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid pageId,
        Guid wordId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        int initialLevel,
        CancellationToken cancellationToken = default) =>
        AddPracticeWordsToReviewAsync(userId, pageId, wordId, timeZone, utcNow, cancellationToken);

    Task<ReviewSessionDto> CreateReviewSessionAsync(
        Guid userId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);

    Task<ReviewDashboardDto> GetDashboardAsync(
        Guid userId,
        TimeZoneInfo timeZone,
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

    Task<ReviewAnswerResultDto?> AddPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        PronunciationAssessmentDto assessment,
        int timeSpentSeconds,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
}
