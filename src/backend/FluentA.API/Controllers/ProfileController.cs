using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/profile")]
public sealed class ProfileController : ApiControllerBase
{
    private readonly IAuthService _auth;
    public ProfileController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userId = CurrentUserId();
        var profileResult = await _auth.GetProfileAsync(userId, cancellationToken);
        if (!profileResult.IsSuccess)
        {
            return ToErrorResult(profileResult);
        }

        return Ok(ApiResponse<UserProfileDto>.Ok(profileResult.Value!));
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileBody body, CancellationToken cancellationToken)
    {
        var result = await _auth.UpdateProfileAsync(CurrentUserId(), new UpdateProfileRequest(
            body.FullName, body.Bio, body.RemoveAvatar, body.AvatarAssetId), cancellationToken);
        return result.IsSuccess ? Ok(ApiResponse<UserProfileDto>.Ok(result.Value!)) : ToErrorResult(result);
    }
}
