using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FluentA.API.Controllers;

[ApiController]
[Route("api/v1/auth")]
public sealed class AuthController : ApiControllerBase
{
    private const string AccessCookieName = "access_token";
    private readonly IAuthService _auth;

    public AuthController(IAuthService auth) => _auth = auth;

    [HttpPost("register")]
    [EnableRateLimiting("auth-register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.RegisterAsync(request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<RegisterResponse>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("verify-otp")]
    [EnableRateLimiting("auth-verify")]
    public async Task<IActionResult> VerifyOtp(VerifyOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.VerifyOtpAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("resend-verification-otp")]
    [EnableRateLimiting("auth-resend")]
    public async Task<IActionResult> ResendVerificationOtp(ResendVerificationOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ResendVerificationOtpAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<ResendVerificationOtpResponse>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("login")]
    [EnableRateLimiting("auth-login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken) =>
        AuthResult(await _auth.LoginAsync(request, cancellationToken));

    [HttpPost("google-login")]
    [EnableRateLimiting("auth-google")]
    public async Task<IActionResult> GoogleLogin(GoogleLoginRequest request, CancellationToken cancellationToken) =>
        AuthResult(await _auth.GoogleLoginAsync(request, cancellationToken));

    [HttpPost("forgot-password")]
    [EnableRateLimiting("auth-forgot")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ForgotPasswordAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<ForgotPasswordResponse>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("reset-password")]
    [EnableRateLimiting("auth-reset")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ResetPasswordAsync(request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BasicMessageResponse>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("logout")]
    public IActionResult Logout()
    {
        Response.Cookies.Delete(AccessCookieName, CookieOptions());
        return Ok(ApiEnvelope<object>.Ok(new { message = "Logged out." }));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiEnvelope<object>.Fail(new ApiErrorEnvelope("UNAUTHORIZED", "Missing or invalid authentication credentials.")));
        }

        var result = await _auth.GetMeAsync(userId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [Authorize]
    [HttpPut("/api/v1/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileBody body, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
        {
            return Unauthorized(ApiEnvelope<object>.Fail(new ApiErrorEnvelope("UNAUTHORIZED", "Missing or invalid authentication credentials.")));
        }

        var result = await _auth.UpdateProfileAsync(userId, new UpdateProfileRequest(body.FullName, body.Bio, body.RemoveAvatar, body.AvatarAssetId), cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    private IActionResult AuthResult(OperationResult<AuthResponse> result)
    {
        if (!result.IsSuccess) return ToErrorResult(result);
        Response.Cookies.Append(AccessCookieName, result.Value!.Token, CookieOptions(DateTimeOffset.UtcNow.AddDays(7)));
        return Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value.User));
    }

    private static CookieOptions CookieOptions(DateTimeOffset? expires = null) => new()
    {
        HttpOnly = true,
        Secure = true,
        SameSite = SameSiteMode.Strict,
        Path = "/",
        Expires = expires,
        IsEssential = true
    };

    private bool TryGetUserId(out Guid userId)
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        return Guid.TryParse(claim, out userId);
    }

}
