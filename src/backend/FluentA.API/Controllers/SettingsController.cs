using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.BoundedContexts.Practice;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1")]
public sealed class SettingsController : ApiControllerBase
{
    private readonly IAuthService _auth;
    private readonly IPracticeService _practice;
    public SettingsController(IAuthService auth, IPracticeService practice)
    {
        _auth = auth;
        _practice = practice;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        var profileResult = await _auth.GetMeAsync(userId, cancellationToken);
        if (!profileResult.IsSuccess)
        {
            return ToErrorResult(profileResult);
        }

        var practiceSettings = await _practice.GetPracticeSettingsAsync(userId, cancellationToken);
        return Ok(ApiEnvelope<SettingsDto>.Ok(new SettingsDto(profileResult.Value!, practiceSettings)));
    }

}
