using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IUserRepository
{
    Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default);
    Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default);
    Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default);
    Task AddAsync(User user, CancellationToken cancellationToken = default);
    Task UpdateAsync(User user, CancellationToken cancellationToken = default);
    Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(string normalizedEmail, string otpHash, DateTime now, int maxFailedAttempts, CancellationToken cancellationToken = default);
    Task<bool> TryReplaceVerificationOtpAsync(Guid userId, string otpHash, DateTime expiresAt, DateTime resendAvailableAt, DateTime now, CancellationToken cancellationToken = default);
    Task<bool> ConsumePasswordResetAsync(string tokenHash, string passwordHash, DateTime now, CancellationToken cancellationToken = default);
}
