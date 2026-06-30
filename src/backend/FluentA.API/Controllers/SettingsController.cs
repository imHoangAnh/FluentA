using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1")]
public sealed class SettingsController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IFlashcardService _flashcards;

    public SettingsController(IAuthService auth, IFlashcardService flashcards)
    {
        _auth = auth;
        _flashcards = flashcards;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        var profileResult = await _auth.GetMeAsync(userId, cancellationToken);
        if (!profileResult.IsSuccess)
        {
            return ToAuthError(profileResult);
        }

        var practiceSettings = await _flashcards.GetPracticeSettingsAsync(userId, cancellationToken);
        var reviewSettings = await _flashcards.GetReviewSettingsAsync(userId, cancellationToken);

        return Ok(ApiEnvelope<SettingsDto>.Ok(new SettingsDto(profileResult.Value!, practiceSettings, reviewSettings)));
    }

    [HttpGet("practice/settings")]
    public async Task<IActionResult> GetPracticeSettings(CancellationToken cancellationToken)
    {
        var settings = await _flashcards.GetPracticeSettingsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<PracticeSettingsDto>.Ok(settings));
    }

    [HttpPut("practice/settings")]
    public async Task<IActionResult> UpdatePracticeSettings(UpdatePracticeSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _flashcards.UpdatePracticeSettingsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PracticeSettingsDto>.Ok(result.Value!))
            : ToFlashcardError(result);
    }

    [HttpGet("review/settings")]
    public async Task<IActionResult> GetReviewSettings(CancellationToken cancellationToken)
    {
        var settings = await _flashcards.GetReviewSettingsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<ReviewSettingsDto>.Ok(settings));
    }

    [HttpPut("review/settings")]
    public async Task<IActionResult> UpdateReviewSettings(UpdateReviewSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _flashcards.UpdateReviewSettingsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSettingsDto>.Ok(result.Value!))
            : ToFlashcardError(result);
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

    private IActionResult ToAuthError<T>(FluentA.Application.Common.OperationResult<T> result)
    {
        if (result.Error is not AuthError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }

    private IActionResult ToFlashcardError<T>(FluentA.Application.Common.OperationResult<T> result)
    {
        if (result.Error is not FlashcardError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
