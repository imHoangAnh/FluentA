using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ControllerBase
{
    private const string RefreshCookieName = "fluenta_refresh";
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth)
    {
        _auth = auth;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.RegisterAsync(request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<object>.Ok(new { message = result.Value }))
            : ToErrorResult<string>(result);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, cancellationToken);
        return AuthResult(result);
    }

    [HttpPost("google")]
    public async Task<IActionResult> Google(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.GoogleLoginAsync(request, cancellationToken);
        return AuthResult(result);
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var result = await _auth.RefreshAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        return AuthResult(result);
    }

    [Authorize]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        var result = await _auth.LogoutAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        Response.Cookies.Delete(RefreshCookieName);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Logged out." }))
            : ToErrorResult<bool>(result);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            return Unauthorized(ApiEnvelope<object>.Fail(new ApiErrorEnvelope("UNAUTHORIZED", "Missing or invalid authentication credentials.")));
        }

        var result = await _auth.GetMeAsync(id, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!)) : ToErrorResult<UserProfileDto>(result);
    }

    private IActionResult AuthResult(OperationResult<AuthResponse> result)
    {
        if (!result.IsSuccess)
        {
            return ToErrorResult<AuthResponse>(result);
        }

        SetRefreshCookie(result.Value!.RefreshToken);
        return Ok(ApiEnvelope<object>.Ok(new
        {
            result.Value.AccessToken,
            result.Value.User
        }));
    }

    private void SetRefreshCookie(string refreshToken)
    {
        Response.Cookies.Append(RefreshCookieName, refreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = false,
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(7)
        });
    }

    private IActionResult ToErrorResult<T>(OperationResult<T> result)
    {
        if (result.Error is not AuthError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        var envelope = ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details));
        return StatusCode(error.StatusCode, envelope);
    }
}
