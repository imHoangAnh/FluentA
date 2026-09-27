namespace FluentA.Application.BoundedContexts.Auth.DTOs;

public sealed record RegisterRequest(string Email, string Password, string FullName);
public sealed record RegisterResponse(string NextStep, string Message, string Email, DateTime VerificationExpiresAtUtc);
public sealed record LoginRequest(string Email, string Password);
public sealed record VerifyOtpRequest(string? Email = null, string? Otp = null);
public sealed record ResendVerificationOtpRequest(string Email);
public sealed record VerifyOtpResponse(string NextStep);
public sealed record ResendVerificationOtpResponse(string NextStep, string Message, string Email, DateTime VerificationExpiresAtUtc);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ForgotPasswordResponse(string Message);
public sealed record ResetPasswordRequest(string Token, string NewPassword);
public sealed record BasicMessageResponse(string Message, string? NextStep = null);
public sealed record GoogleLoginRequest(string IdToken);
public sealed record UpdateProfileRequest(string? FullName = null, string? Bio = null, bool RemoveAvatar = false, Guid? AvatarAssetId = null);
public sealed record SettingsDto(UserProfileDto Profile, FluentA.Application.BoundedContexts.Practice.DTOs.PracticeSettingsDto PracticeSettings);

// AuthResponse is an application-to-controller result. Access and refresh token values
// are written only to HttpOnly cookies; AuthResultDto is the JSON projection.
public sealed record AuthResponse(
    string NextStep,
    string? AccessToken = null,
    string? RefreshToken = null,
    DateTime? AccessTokenExpiresAtUtc = null,
    DateTime? RefreshTokenExpiresAtUtc = null,
    AuthUserDto? User = null,
    string? Email = null,
    DateTime? VerificationExpiresAtUtc = null,
    string? Message = null);

public sealed record AuthResultDto(
    string NextStep,
    AuthUserDto? User = null,
    DateTime? AccessTokenExpiresAtUtc = null,
    string? Email = null,
    DateTime? VerificationExpiresAtUtc = null,
    string? Message = null);

public sealed record RefreshResponse(string AccessToken, DateTime AccessTokenExpiresAtUtc);
public sealed record RefreshResultDto(DateTime AccessTokenExpiresAtUtc);
public sealed record AccessTokenIssue(string Token, DateTime ExpiresAtUtc);
public sealed record GoogleLoginSessionResult(GoogleLoginResult Result, AccessTokenIssue? AccessToken);
public sealed record AuthUserDto(Guid Id, string FullName, string? AvatarUrl);
public sealed record UserProfileDto(Guid Id, string Email, string FullName, bool IsEmailVerified, string? Bio = null, Guid? AvatarAssetId = null, string? AvatarDownloadUrl = null, DateTime? AvatarDownloadUrlExpiresAtUtc = null);
public sealed record GoogleUserInfo(string Subject, string Email, string FullName, bool EmailVerified);
public sealed record EmailMessage(string To, string Subject, string HtmlBody, string TextBody);

public enum VerificationOtpConsumeResult
{
    Invalid,
    Verified
}

public enum GoogleLoginResult
{
    Authenticated,
    AccountConflict
}
