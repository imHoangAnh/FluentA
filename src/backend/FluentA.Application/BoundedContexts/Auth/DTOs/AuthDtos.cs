namespace FluentA.Application.BoundedContexts.Auth.DTOs;

public sealed record RegisterRequest(string Email, string Password, string FullName);
public sealed record RegisterResponse(string Message, string Email, DateTime VerificationExpiresAtUtc, DateTime ResendAvailableAtUtc);
public sealed record LoginRequest(string Email, string Password);
public sealed record VerifyOtpRequest(string? Email = null, string? Otp = null);
public sealed record ResendVerificationOtpRequest(string Email);
public sealed record ResendVerificationOtpResponse(string Message, string Email, DateTime VerificationExpiresAtUtc, DateTime ResendAvailableAtUtc);
public sealed record ForgotPasswordRequest(string Email);
public sealed record ForgotPasswordResponse(string Message);
public sealed record ResetPasswordRequest(string Token, string NewPassword);
public sealed record BasicMessageResponse(string Message);
public sealed record GoogleLoginRequest(string IdToken);
public sealed record UpdateProfileRequest(string? FullName = null, string? Bio = null, bool RemoveAvatar = false, Guid? AvatarAssetId = null);
public sealed record SettingsDto(UserProfileDto Profile, FluentA.Application.BoundedContexts.Practice.DTOs.PracticeSettingsDto PracticeSettings, FluentA.Application.BoundedContexts.Review.DTOs.ReviewSettingsDto ReviewSettings);
public sealed record AuthResponse(string Token, UserProfileDto User);
public sealed record UserProfileDto(Guid Id, string Email, string FullName, bool IsEmailVerified, string? Bio = null, Guid? AvatarAssetId = null, string? AvatarDownloadUrl = null, DateTime? AvatarDownloadUrlExpiresAtUtc = null);
public sealed record GoogleUserInfo(string Subject, string Email, string FullName, bool EmailVerified);
public sealed record EmailMessage(string To, string Subject, string HtmlBody, string TextBody);

public enum VerificationOtpConsumeResult
{
    Invalid,
    Verified
}
