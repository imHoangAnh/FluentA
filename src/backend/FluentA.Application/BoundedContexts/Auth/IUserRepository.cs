using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);
    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<bool> TryUpsertUnverifiedRegistrationAsync(User user, CancellationToken cancellationToken = default);
    Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(string normalizedEmail, string otpHash, DateTime now, CancellationToken cancellationToken = default);
    Task<bool> TryReplaceVerificationOtpAsync(Guid userId, string otpHash, DateTime expiresAt, DateTime now, CancellationToken cancellationToken = default);
    Task<bool> TrySetPasswordResetAsync(string normalizedEmail, string tokenHash, DateTime expiresAt, DateTime now, CancellationToken cancellationToken = default);
    Task<bool> ConsumePasswordResetAsync(string tokenHash, string passwordHash, DateTime now, CancellationToken cancellationToken = default);
    Task<bool> UpdateProfileAsync(User user, CancellationToken cancellationToken = default);
}
