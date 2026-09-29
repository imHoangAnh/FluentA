using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1")]
public sealed class SettingsController : ApiControllerBase
{
    private readonly IAuthService _auth;
    public SettingsController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpGet("settings")]
    public async Task<IActionResult> GetSettings(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        var profileResult = await _auth.GetProfileAsync(userId, cancellationToken);
        if (!profileResult.IsSuccess)
        {
            return ToErrorResult(profileResult);
        }

        return Ok(ApiEnvelope<SettingsDto>.Ok(new SettingsDto(profileResult.Value!)));
    }

}
