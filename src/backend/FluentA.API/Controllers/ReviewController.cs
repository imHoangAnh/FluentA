using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/review")]
public sealed class ReviewController : ApiControllerBase
{
    private readonly IReviewService _review;

    public ReviewController(IReviewService review)
    {
        _review = review;
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateReviewSession(CreateReviewSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await _review.CreateReviewSessionAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionCreatedDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _review.GetDashboardAsync(CurrentUserId(), boardId: null, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<FlashcardDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("dashboard/{boardId:guid}")]
    public async Task<IActionResult> GetBoardDashboard(Guid boardId, [FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _review.GetDashboardAsync(CurrentUserId(), boardId, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<FlashcardDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost]
    public async Task<IActionResult> SubmitReview(SubmitReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _review.SubmitReviewAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("level-five")]
    public async Task<IActionResult> ListLevelFiveWords(CancellationToken cancellationToken)
    {
        var items = await _review.ListLevelFiveWordsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<LevelFiveReviewItemDto>>.Ok(items));
    }

    [HttpPost("level-five/remove")]
    public async Task<IActionResult> RemoveLevelFiveWords(RemoveLevelFiveWordsRequest request, CancellationToken cancellationToken)
    {
        var result = await _review.RemoveLevelFiveWordsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<TrashEntryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

}
