using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/practice")]
public sealed class PracticeController : ApiControllerBase
{
    private readonly IPracticeService _practice;

    public PracticeController(IPracticeService practice)
    {
        _practice = practice;
    }

    [HttpGet("decks")]
    public async Task<IActionResult> GetDecks(
        [FromQuery] Guid boardId,
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var result = await _practice.GetDecksAsync(CurrentUserId(), boardId, search, page, pageSize, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeDeckPageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession(
        CreatePracticeSessionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _practice.CreateSessionAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("sessions/{sessionId:guid}")]
    public async Task<IActionResult> GetSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _practice.GetSessionAsync(CurrentUserId(), sessionId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions/{sessionId:guid}/answers")]
    public async Task<IActionResult> SubmitAnswer(
        Guid sessionId,
        SubmitPracticeAnswerRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _practice.SubmitAnswerAsync(CurrentUserId(), sessionId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeAnswerResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions/{sessionId:guid}/pronunciation-attempts")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> SubmitPronunciationAttempt(
        Guid sessionId,
        [FromForm] Guid itemId,
        [FromForm] IFormFile? audio,
        [FromForm] long durationMs,
        CancellationToken cancellationToken)
    {
        if (audio is null || audio.Length == 0 || audio.Length > PronunciationAudioValidator.MaxAudioBytes)
        {
            return ToErrorResult(
                FluentA.Application.Common.OperationResult<PracticePronunciationAttemptResultDto>.Failure(
                    PronunciationError.InvalidAudio()));
        }

        var wavAudio = await ReadAudioAsync(audio.OpenReadStream(), cancellationToken);
        var result = await _practice.SubmitPronunciationAttemptAsync(
            CurrentUserId(),
            sessionId,
            itemId,
            wavAudio,
            durationMs,
            cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticePronunciationAttemptResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPut("sessions/{sessionId:guid}/words/{wordId:guid}/review-level")]
    public async Task<IActionResult> SetReviewLevel(
        Guid sessionId,
        Guid wordId,
        SetPracticeReviewLevelRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _practice.SetReviewLevelAsync(CurrentUserId(), sessionId, wordId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeReviewLevelResultDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("sessions/{sessionId:guid}/complete")]
    public async Task<IActionResult> CompleteSession(
        Guid sessionId,
        CompletePracticeSessionRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _practice.CompleteSessionAsync(CurrentUserId(), sessionId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    private static async Task<byte[]> ReadAudioAsync(Stream body, CancellationToken cancellationToken)
    {
        var buffer = new byte[PronunciationAudioValidator.MaxAudioBytes + 1];
        var totalRead = 0;
        while (totalRead < buffer.Length)
        {
            var bytesRead = await body.ReadAsync(buffer.AsMemory(totalRead, buffer.Length - totalRead), cancellationToken);
            if (bytesRead == 0)
            {
                break;
            }

            totalRead += bytesRead;
        }

        return buffer[..totalRead];
    }
}
