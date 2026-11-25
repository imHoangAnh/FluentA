using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
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

    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(CancellationToken cancellationToken)
    {
        var result = await _review.GetDashboardAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ReviewDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateReviewSession(CancellationToken cancellationToken)
    {
        var result = await _review.CreateReviewSessionAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ReviewSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("sessions/{sessionId:guid}")]
    public async Task<IActionResult> GetReviewSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _review.GetSessionAsync(CurrentUserId(), sessionId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ReviewSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions/{sessionId:guid}/answers")]
    public async Task<IActionResult> SubmitAnswer(
        Guid sessionId,
        SubmitReviewAnswerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _review.SubmitTypedAnswerAsync(CurrentUserId(), sessionId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ReviewAnswerResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }
}
