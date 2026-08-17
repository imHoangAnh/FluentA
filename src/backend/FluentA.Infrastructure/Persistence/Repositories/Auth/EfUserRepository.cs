using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Auth;

public sealed class EfUserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;

    public EfUserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _dbContext.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken);
    }

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return _dbContext.Users.FirstOrDefaultAsync(user => user.Email == normalizedEmail, cancellationToken);
    }

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Users.FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);
    }

    public async Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        await _dbContext.Users.AddAsync(user, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        _dbContext.Users.Update(user);
        return _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(
        string normalizedEmail,
        string otpHash,
        DateTime now,
        int maxFailedAttempts,
        CancellationToken cancellationToken = default)
    {
        var verified = await _dbContext.Users
            .Where(user => user.Email == normalizedEmail
                && user.EmailVerifiedAt == null
                && user.OtpCode == otpHash
                && user.OtpExpiresAt > now
                && user.OtpFailedAttempts < maxFailedAttempts)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.EmailVerifiedAt, now)
                .SetProperty(user => user.OtpCode, (string?)null)
                .SetProperty(user => user.OtpExpiresAt, (DateTime?)null)
                .SetProperty(user => user.OtpFailedAttempts, 0)
                .SetProperty(user => user.OtpResendAvailableAt, (DateTime?)null)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);

        if (verified == 1)
        {
            return VerificationOtpConsumeResult.Verified;
        }

        await _dbContext.Users
            .Where(user => user.Email == normalizedEmail
                && user.EmailVerifiedAt == null
                && user.OtpCode != null
                && user.OtpExpiresAt > now
                && user.OtpFailedAttempts < maxFailedAttempts)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.OtpFailedAttempts, user => user.OtpFailedAttempts + 1)
                .SetProperty(user => user.OtpCode, user => user.OtpFailedAttempts + 1 >= maxFailedAttempts ? null : user.OtpCode)
                .SetProperty(user => user.OtpExpiresAt, user => user.OtpFailedAttempts + 1 >= maxFailedAttempts ? null : user.OtpExpiresAt)
                .SetProperty(user => user.OtpResendAvailableAt, user => user.OtpFailedAttempts + 1 >= maxFailedAttempts ? null : user.OtpResendAvailableAt)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);

        return VerificationOtpConsumeResult.Invalid;
    }

    public async Task<bool> TryReplaceVerificationOtpAsync(
        Guid userId,
        string otpHash,
        DateTime expiresAt,
        DateTime resendAvailableAt,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var updated = await _dbContext.Users
            .Where(user => user.Id == userId
                && user.EmailVerifiedAt == null
                && (user.OtpResendAvailableAt == null || user.OtpResendAvailableAt <= now))
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.OtpCode, otpHash)
                .SetProperty(user => user.OtpExpiresAt, expiresAt)
                .SetProperty(user => user.OtpFailedAttempts, 0)
                .SetProperty(user => user.OtpResendAvailableAt, resendAvailableAt)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);

        return updated == 1;
    }

    public async Task<bool> ConsumePasswordResetAsync(
        string tokenHash,
        string passwordHash,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var updated = await _dbContext.Users
            .Where(user => user.ResetPasswordToken == tokenHash && user.ResetPasswordExpiresAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.PasswordHash, passwordHash)
                .SetProperty(user => user.ResetPasswordToken, (string?)null)
                .SetProperty(user => user.ResetPasswordExpiresAt, (DateTime?)null)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);

        return updated == 1;
    }
}
