namespace FluentA.Application.BoundedContexts.Auth.DTOs;

public sealed record RegisterRequest(string Email, string Password, string FullName);

public sealed record RegisterResponse(
    string Message,
    string Email,
    DateTime VerificationExpiresAtUtc,
    DateTime ResendAvailableAtUtc,
    string? DevelopmentOtp = null);

public sealed record LoginRequest(string Email, string Password);

public sealed record VerifyEmailRequest(string? Email = null, string? Otp = null);

public sealed record ResendVerificationOtpRequest(string Email);

public sealed record ResendVerificationOtpResponse(
    string Message,
    string Email,
    DateTime VerificationExpiresAtUtc,
    DateTime ResendAvailableAtUtc,
    string? DevelopmentOtp = null);

public sealed record ForgotPasswordRequest(string Email);

public sealed record ForgotPasswordResponse(
    string Message,
    bool AccountExists,
    string? DevelopmentResetUrl = null);

public sealed record ResetPasswordRequest(string Token, string Password, string ConfirmPassword);

public sealed record BasicMessageResponse(string Message);

public sealed record GoogleLoginRequest(string Code, string? RedirectUri = null);

public sealed record UpdateProfileRequest(
    string? FullName = null,
    string? Bio = null,
    bool RemoveAvatar = false,
    AvatarUpload? Avatar = null);

public sealed record SettingsDto(
    UserProfileDto Profile,
    FluentA.Application.BoundedContexts.Flashcards.DTOs.PracticeSettingsDto PracticeSettings,
    FluentA.Application.BoundedContexts.Flashcards.DTOs.ReviewSettingsDto ReviewSettings);

public sealed record AuthResponse(string AccessToken, UserProfileDto User, string RefreshToken);

public sealed record UserProfileDto(
    Guid Id,
    string Email,
    string FullName,
    bool IsEmailVerified,
    string? Bio = null,
    string? AvatarUrl = null);

public sealed record RefreshTokenIssue(string RawToken, DateTime ExpiresAt);

public sealed record RefreshTokenSession(Guid Id, Guid UserId, string TokenHash, DateTime ExpiresAt, DateTime? RevokedAt);

public sealed record GoogleUserInfo(string Subject, string Email, string FullName, bool EmailVerified);
