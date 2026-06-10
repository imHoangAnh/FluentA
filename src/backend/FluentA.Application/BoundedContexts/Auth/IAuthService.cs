using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IAuthService
{
    /// <summary>Registers a password account and prepares email verification.</summary>
    Task<OperationResult<RegisterResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    /// <summary>Verifies an email verification token.</summary>
    Task<OperationResult<UserProfileDto>> VerifyEmailAsync(VerifyEmailRequest request, CancellationToken cancellationToken = default);
    /// <summary>Authenticates a verified password account.</summary>
    Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    /// <summary>Rotates a refresh token and issues a new access token.</summary>
    Task<OperationResult<AuthResponse>> RefreshAsync(string? refreshToken, CancellationToken cancellationToken = default);
    /// <summary>Revokes a refresh token.</summary>
    Task<OperationResult<bool>> LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default);
    /// <summary>Returns the current user profile by user id.</summary>
    Task<OperationResult<UserProfileDto>> GetMeAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Authenticates or links a user through Google OAuth.</summary>
    Task<OperationResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default);
}
