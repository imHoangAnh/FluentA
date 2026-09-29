using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewService
{
    Task<OperationResult<ReviewSessionDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewDashboardDto>> GetDashboardAsync(
        Guid userId,
        string? timeZoneId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewSessionDto>> GetSessionAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewAnswerResultDto>> SubmitTypedAnswerAsync(
        Guid userId,
        Guid sessionId,
        SubmitReviewAnswerRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewAnswerResultDto>> SubmitPronunciationAttemptAsync(
        Guid userId,
        Guid sessionId,
        Guid itemId,
        ReadOnlyMemory<byte> wavAudio,
        int timeSpentSeconds,
        CancellationToken cancellationToken = default);
}
