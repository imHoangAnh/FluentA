using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.AspNetCore.RateLimiting;

namespace FluentA.API.Controllers;

[ApiController]
[AuthValidationEnvelope]
[Route("api/v1/auth")]
[ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
public sealed class AuthController : ApiControllerBase
{
    private const string AccessCookieName = "access_token";
    private const string RefreshCookieName = "refresh_token";
    private readonly IAuthService _auth;
    private readonly HashSet<string> _allowedOrigins;

    public AuthController(IAuthService auth, IConfiguration configuration)
    {
        _auth = auth;
        var configuredOrigins = configuration.GetSection("Frontend:Origins").Get<string[]>()
            ?? ["https://localhost:5173", "https://127.0.0.1:5173"];
        var frontendBaseUrl = configuration["Frontend:BaseUrl"] ?? "https://localhost:5173";
        _allowedOrigins = configuredOrigins
            .Append(frontendBaseUrl)
            .Select(NormalizeOrigin)
            .Where(origin => origin is not null)
            .Select(origin => origin!)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

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
        return result.IsSuccess ? Ok(ApiEnvelope<VerifyOtpResponse>.Ok(result.Value!)) : ToErrorResult(result);
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
    public async Task<IActionResult> Login(LoginRequest request, CancellationToken cancellationToken)
    {
        if (!HasAllowedOrigin()) return OriginError();
        return AuthResult(await _auth.LoginAsync(request, cancellationToken));
    }

    [HttpPost("google")]
    [EnableRateLimiting("auth-google")]
    public async Task<IActionResult> GoogleLogin(GoogleLoginRequest request, CancellationToken cancellationToken)
    {
        if (!HasAllowedOrigin()) return OriginError();
        return AuthResult(await _auth.GoogleLoginAsync(request, cancellationToken));
    }

    [HttpPost("refresh")]
    public async Task<IActionResult> Refresh(CancellationToken cancellationToken)
    {
        if (!HasAllowedOrigin()) return OriginError();
        var result = await _auth.RefreshAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        if (!result.IsSuccess) return ToErrorResult(result);

        var issued = result.Value!;
        Response.Cookies.Append(AccessCookieName, issued.AccessToken, CookieOptions(UtcOffset(issued.AccessTokenExpiresAtUtc)));
        return Ok(ApiEnvelope<RefreshResultDto>.Ok(new RefreshResultDto(issued.AccessTokenExpiresAtUtc)));
    }

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
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (!HasAllowedOrigin()) return OriginError();
        await _auth.LogoutAsync(Request.Cookies[RefreshCookieName], cancellationToken);
        Response.Cookies.Delete(AccessCookieName, CookieOptions());
        Response.Cookies.Delete(RefreshCookieName, CookieOptions());
        return Ok(ApiEnvelope<object>.Ok(new { message = "Logged out." }));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized(ApiEnvelope<object>.Fail(
            new ApiErrorEnvelope("AUTHENTICATION_REQUIRED", "Authentication is required.")));

        var result = await _auth.GetMeAsync(userId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<AuthUserDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [Authorize]
    [HttpPut("/api/v1/profile")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileBody body, CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId)) return Unauthorized(ApiEnvelope<object>.Fail(
            new ApiErrorEnvelope("AUTHENTICATION_REQUIRED", "Authentication is required.")));

        var result = await _auth.UpdateProfileAsync(userId, new UpdateProfileRequest(
            body.FullName, body.Bio, body.RemoveAvatar, body.AvatarAssetId), cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<UserProfileDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    private IActionResult AuthResult(OperationResult<AuthResponse> result)
    {
        if (!result.IsSuccess) return ToErrorResult(result);
        var response = result.Value!;
        if (response.NextStep == "AUTHENTICATED")
        {
            Response.Cookies.Append(AccessCookieName, response.AccessToken!, CookieOptions(UtcOffset(response.AccessTokenExpiresAtUtc!.Value)));
            Response.Cookies.Append(RefreshCookieName, response.RefreshToken!, CookieOptions(UtcOffset(response.RefreshTokenExpiresAtUtc!.Value)));
        }

        return Ok(ApiEnvelope<AuthResultDto>.Ok(new AuthResultDto(
            response.NextStep,
            response.User,
            response.AccessTokenExpiresAtUtc,
            response.Email,
            response.VerificationExpiresAtUtc,
            response.Message)));
    }

    private bool HasAllowedOrigin()
    {
        var origin = Request.Headers.Origin.ToString();
        var normalized = NormalizeOrigin(origin);
        return normalized is not null && _allowedOrigins.Contains(normalized);
    }

    private IActionResult OriginError() => StatusCode(StatusCodes.Status403Forbidden,
        ApiEnvelope<object>.Fail(new ApiErrorEnvelope("ORIGIN_INVALID", "The request origin is not allowed.")));

    private static string? NormalizeOrigin(string? value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && (uri.Scheme == Uri.UriSchemeHttps || uri.Scheme == Uri.UriSchemeHttp)
        && string.IsNullOrEmpty(uri.UserInfo)
        && uri.AbsolutePath == "/"
        && string.IsNullOrEmpty(uri.Query)
        && string.IsNullOrEmpty(uri.Fragment)
            ? uri.GetLeftPart(UriPartial.Authority).TrimEnd('/')
            : null;

    private static DateTimeOffset UtcOffset(DateTime value) =>
        new(DateTime.SpecifyKind(value, DateTimeKind.Utc));

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

public sealed class AuthValidationEnvelopeAttribute : ActionFilterAttribute
{
    public AuthValidationEnvelopeAttribute() => Order = -3000;

    public override void OnActionExecuting(ActionExecutingContext context)
    {
        if (context.ModelState.IsValid) return;

        var details = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors
                    .Select(error => string.IsNullOrWhiteSpace(error.ErrorMessage)
                        ? "The supplied value is invalid."
                        : error.ErrorMessage)
                    .ToArray());

        context.Result = new BadRequestObjectResult(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
            "VALIDATION_ERROR", "The request contains invalid values.", details)));
    }
}
