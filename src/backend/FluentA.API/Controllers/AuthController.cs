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

    /// <summary>Registers a password account and returns OTP verification details.</summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.RegisterAsync(request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<RegisterResponse>.Ok(result.Value!))
            : ToErrorResult<RegisterResponse>(result);
    }

    /// <summary>Verifies a password account email address from an OTP.</summary>
    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail(VerifyEmailRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.VerifyEmailAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!))
            : ToErrorResult<UserProfileDto>(result);
    }

    /// <summary>Resends a replacement verification OTP.</summary>
    [HttpPost("resend-verification-otp")]
    public async Task<IActionResult> ResendVerificationOtp(ResendVerificationOtpRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ResendVerificationOtpAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ResendVerificationOtpResponse>.Ok(result.Value!))
            : ToErrorResult<ResendVerificationOtpResponse>(result);
    }

    /// <summary>Authenticates a verified password account.</summary>
    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.LoginAsync(request, cancellationToken);
        return AuthResult(result);
    }

    /// <summary>Authenticates or links a user through Google OAuth.</summary>
    [HttpPost("google")]
    public async Task<IActionResult> Google(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.GoogleLoginAsync(request, cancellationToken);
        return AuthResult(result);
    }

    /// <summary>Starts a password reset flow for a password-capable account.</summary>
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(ForgotPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ForgotPasswordAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ForgotPasswordResponse>.Ok(result.Value!))
            : ToErrorResult<ForgotPasswordResponse>(result);
    }

    /// <summary>Consumes a single-use password reset link.</summary>
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(ResetPasswordRequest request, CancellationToken cancellationToken)
    {
        var result = await _auth.ResetPasswordAsync(request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<BasicMessageResponse>.Ok(result.Value!))
            : ToErrorResult<BasicMessageResponse>(result);
    }

    /// <summary>Rotates the refresh cookie and returns a new access token.</summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        var result = await _auth.RefreshAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        return AuthResult(result);
    }

    /// <summary>Revokes the current refresh session and clears the refresh cookie.</summary>
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

    /// <summary>Returns the authenticated user's profile.</summary>
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
