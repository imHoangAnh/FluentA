using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IAuthService
{
    Task<OperationResult<RegisterResponse>> RegisterAsync(RegisterRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<UserProfileDto>> VerifyOtpAsync(VerifyOtpRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<ResendVerificationOtpResponse>> ResendVerificationOtpAsync(ResendVerificationOtpRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<AuthResponse>> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<AuthResponse>> GoogleLoginAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<ForgotPasswordResponse>> ForgotPasswordAsync(ForgotPasswordRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<BasicMessageResponse>> ResetPasswordAsync(ResetPasswordRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<UserProfileDto>> GetMeAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken cancellationToken = default);
}
