using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewService
{
    Task<OperationResult<ReviewSessionDto>> CreateReviewSessionAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewDashboardDto>> GetDashboardAsync(
        Guid userId,
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
}
