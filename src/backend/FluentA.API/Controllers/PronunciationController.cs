using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/pronunciation")]
public sealed class PronunciationController : ApiControllerBase
{
    private readonly IPronunciationService _pronunciation;

    public PronunciationController(IPronunciationService pronunciation)
    {
        _pronunciation = pronunciation;
    }

    [HttpPost("words/{wordId:guid}/assessment")]
    public async Task<IActionResult> Assess(Guid wordId, CancellationToken cancellationToken)
    {
        var mediaType = Request.ContentType?.Split(';', 2)[0].Trim();
        if (!string.Equals(mediaType, "audio/wav", StringComparison.OrdinalIgnoreCase))
        {
            return ToErrorResult(
                FluentA.Application.Common.OperationResult<PronunciationAssessmentDto>.Failure(
                    PronunciationError.InvalidAudio()));
        }

        var audio = await ReadAudioAsync(Request.Body, cancellationToken);
        var result = await _pronunciation.AssessAsync(CurrentUserId(), wordId, audio, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PronunciationAssessmentDto>.Ok(result.Value!))
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
