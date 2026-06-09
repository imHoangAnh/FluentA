using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IAuthService
{
    Task<OperationResult<string>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<AuthResponse>> RefreshAsync(string? refreshToken, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> LogoutAsync(string? refreshToken, CancellationToken cancellationToken = default);
    Task<OperationResult<UserProfileDto>> GetMeAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default);
}
