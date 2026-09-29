using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Review.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    public async Task<IActionResult> GetDashboard([FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _review.GetDashboardAsync(CurrentUserId(), timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateReviewSession(CreateReviewSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await _review.CreateReviewSessionAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("sessions/{sessionId:guid}")]
    public async Task<IActionResult> GetReviewSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _review.GetSessionAsync(CurrentUserId(), sessionId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionDto>.Ok(result.Value!))
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
            ? Ok(ApiEnvelope<ReviewAnswerResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions/{sessionId:guid}/pronunciation-attempts")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubmitPronunciationAttempt(
        Guid sessionId,
        [FromForm] ReviewPronunciationAttemptForm request,
        CancellationToken cancellationToken)
    {
        var audio = request.Audio is null
            ? Array.Empty<byte>()
            : await ReadAudioAsync(request.Audio, cancellationToken);
        var result = await _review.SubmitPronunciationAttemptAsync(
            CurrentUserId(),
            sessionId,
            request.ItemId,
            audio,
            request.TimeSpentSeconds,
            cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewAnswerResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    private static async Task<byte[]> ReadAudioAsync(IFormFile audio, CancellationToken cancellationToken)
    {
        if (audio.Length > PronunciationAudioValidator.MaxAudioBytes)
        {
            return [0];
        }

        await using var stream = audio.OpenReadStream();
        var buffer = new byte[PronunciationAudioValidator.MaxAudioBytes + 1];
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var bytesRead = await stream.ReadAsync(buffer.AsMemory(totalRead), cancellationToken);
            if (bytesRead == 0)
            {
                break;
            }

            totalRead += bytesRead;
        }

        return buffer[..totalRead];
    }
}

public sealed class ReviewPronunciationAttemptForm
{
    public Guid ItemId { get; set; }
    public IFormFile? Audio { get; set; }
    public int TimeSpentSeconds { get; set; }
}
