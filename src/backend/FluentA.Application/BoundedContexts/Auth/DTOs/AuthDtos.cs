namespace FluentA.Application.BoundedContexts.Auth.DTOs;

public sealed record RegisterRequest(string Email, string Password, string FullName);

public sealed record RegisterResponse(string Message, string EmailVerificationToken, string EmailVerificationUrl);

public sealed record LoginRequest(string Email, string Password);

public sealed record VerifyEmailRequest(string Token);

public sealed record GoogleLoginRequest(string Code, string? RedirectUri = null);

public sealed record AuthResponse(string AccessToken, UserProfileDto User, string RefreshToken);

public sealed record UserProfileDto(Guid Id, string Email, string FullName, bool IsEmailVerified);

public sealed record RefreshTokenIssue(string RawToken, DateTime ExpiresAt);

public sealed record RefreshTokenSession(Guid Id, Guid UserId, string TokenHash, DateTime ExpiresAt, DateTime? RevokedAt);

public sealed record GoogleUserInfo(string Subject, string Email, string FullName, bool EmailVerified);
