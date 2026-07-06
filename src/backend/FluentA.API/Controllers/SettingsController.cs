using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Review;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1")]
public sealed class SettingsController : ControllerBase
{
    private readonly IAuthService _auth;
    private readonly IPracticeService _practice;
    private readonly IReviewService _review;

    public SettingsController(IAuthService auth, IPracticeService practice, IReviewService review)
    {
        _auth = auth;
        _practice = practice;
        _review = review;
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

        var practiceSettings = await _practice.GetPracticeSettingsAsync(userId, cancellationToken);
        var reviewSettings = await _review.GetReviewSettingsAsync(userId, cancellationToken);

        return Ok(ApiEnvelope<SettingsDto>.Ok(new SettingsDto(profileResult.Value!, practiceSettings, reviewSettings)));
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
}
