using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Review;

public interface IReviewService
{
    Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
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

    Task<OperationResult<IReadOnlyList<TrashEntryDto>>> RemoveLevelFiveWordsAsync(
        Guid userId,
        RemoveLevelFiveWordsRequest request,
        CancellationToken cancellationToken = default);
}
