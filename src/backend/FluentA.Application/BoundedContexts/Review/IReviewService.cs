using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewService
{
    Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewSessionSummaryDto>> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);

    Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewSettingsDto>> UpdateReviewSettingsAsync(
        Guid userId,
        UpdateReviewSettingsRequest request,
        CancellationToken cancellationToken = default);

    Task<OperationResult<FlashcardDashboardDto>> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        string? timeZoneId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<ReviewResultDto>> SubmitReviewAsync(
        Guid userId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyList<LevelFiveReviewItemDto>> ListLevelFiveWordsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<OperationResult<int>> RemoveLevelFiveWordsAsync(
        Guid userId,
        RemoveLevelFiveWordsRequest request,
        CancellationToken cancellationToken = default);
}
