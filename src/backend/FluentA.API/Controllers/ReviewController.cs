using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/review")]
public sealed class ReviewController : ControllerBase
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

    [HttpGet("sessions/{sessionId:guid}/summary")]
    public async Task<IActionResult> GetReviewSessionSummary(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _review.GetReviewSessionSummaryAsync(CurrentUserId(), sessionId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionSummaryDto>.Ok(result.Value!))
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

    [HttpGet("settings")]
    public async Task<IActionResult> GetReviewSettings(CancellationToken cancellationToken)
    {
        var settings = await _review.GetReviewSettingsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<ReviewSettingsDto>.Ok(settings));
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateReviewSettings(UpdateReviewSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _review.UpdateReviewSettingsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSettingsDto>.Ok(result.Value!))
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
            ? Ok(ApiEnvelope<int>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    private Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedAccessException("Missing authenticated user id.");
        }

        return id;
    }

    private IActionResult ToErrorResult<T>(FluentA.Application.Common.OperationResult<T> result)
    {
        var error = result.Error switch
        {
            ReviewError reviewError => new ApiErrorEnvelope(reviewError.Code, reviewError.Message, reviewError.Details),
            _ => null,
        };

        var statusCode = result.Error switch
        {
            ReviewError reviewError => reviewError.StatusCode,
            _ => 500,
        };

        if (error is null)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(statusCode, ApiEnvelope<object>.Fail(error));
    }
}
