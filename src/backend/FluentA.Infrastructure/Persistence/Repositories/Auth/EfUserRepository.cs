using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Auth;

public sealed class EfUserRepository : IUserRepository
{
    private readonly AppDbContext _dbContext;

    public EfUserRepository(AppDbContext dbContext) => _dbContext = dbContext;

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(
            user => user.Email == normalizedEmail && user.DeletedAt == null, cancellationToken);

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _dbContext.Users.AsNoTracking().FirstOrDefaultAsync(
            user => user.Id == userId && user.DeletedAt == null, cancellationToken);

    public async Task<bool> TryUpsertUnverifiedRegistrationAsync(User user, CancellationToken cancellationToken = default)
    {
        var affected = await _dbContext.Database.ExecuteSqlInterpolatedAsync($"""
            INSERT INTO users (
                id, email, full_name, bio, current_avatar_asset_id, password_hash, google_id,
                email_verified_at, otp_hash, otp_expires_at, reset_password_token_hash,
                reset_password_expires_at, last_login_at, created_at, updated_at, deleted_at)
            VALUES (
                {user.Id}, {user.Email}, {user.FullName}, {user.Bio}, {user.CurrentAvatarAssetId}, {user.PasswordHash}, {user.GoogleId},
                {user.EmailVerifiedAt}, {user.OtpHash}, {user.OtpExpiresAt}, {user.ResetPasswordTokenHash},
                {user.ResetPasswordExpiresAt}, {user.LastLoginAt}, {user.CreatedAt}, {user.UpdatedAt}, {user.DeletedAt})
            ON CONFLICT (email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                password_hash = EXCLUDED.password_hash,
                otp_hash = EXCLUDED.otp_hash,
                otp_expires_at = EXCLUDED.otp_expires_at,
                reset_password_token_hash = NULL,
                reset_password_expires_at = NULL,
                updated_at = EXCLUDED.updated_at
            WHERE users.email_verified_at IS NULL AND users.deleted_at IS NULL
            """, cancellationToken);

        return affected == 1;
    }

    public async Task<VerificationOtpConsumeResult> ConsumeVerificationOtpAsync(
        string normalizedEmail,
        string otpHash,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var verified = await _dbContext.Users
            .Where(user => user.Email == normalizedEmail && user.DeletedAt == null && user.EmailVerifiedAt == null
                && user.OtpHash == otpHash && user.OtpExpiresAt > now)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.EmailVerifiedAt, now)
                .SetProperty(user => user.OtpHash, (string?)null)
                .SetProperty(user => user.OtpExpiresAt, (DateTime?)null)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);

        return verified == 1 ? VerificationOtpConsumeResult.Verified : VerificationOtpConsumeResult.Invalid;
    }

    public async Task<bool> TryReplaceVerificationOtpAsync(
        Guid userId,
        string otpHash,
        DateTime expiresAt,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var updated = await _dbContext.Users
            .Where(user => user.Id == userId && user.DeletedAt == null && user.EmailVerifiedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.OtpHash, otpHash)
                .SetProperty(user => user.OtpExpiresAt, expiresAt)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);
        return updated == 1;
    }

    public async Task<bool> TrySetPasswordResetAsync(
        string normalizedEmail,
        string tokenHash,
        DateTime expiresAt,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        var updated = await _dbContext.Users
            .Where(user => user.Email == normalizedEmail && user.DeletedAt == null && user.PasswordHash != null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(user => user.ResetPasswordTokenHash, tokenHash)
                .SetProperty(user => user.ResetPasswordExpiresAt, expiresAt)
                .SetProperty(user => user.UpdatedAt, now), cancellationToken);
        return updated == 1;
    }

    public async Task<bool> ConsumePasswordResetAsync(
        string tokenHash,
        string passwordHash,
        DateTime now,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var user = await _dbContext.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE reset_password_token_hash = {tokenHash} AND reset_password_expires_at > {now} AND deleted_at IS NULL FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        if (user is null) return false;

        await _dbContext.Users
            .Where(candidate => candidate.Id == user.Id)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(candidate => candidate.PasswordHash, passwordHash)
                .SetProperty(candidate => candidate.ResetPasswordTokenHash, (string?)null)
                .SetProperty(candidate => candidate.ResetPasswordExpiresAt, (DateTime?)null)
                .SetProperty(candidate => candidate.UpdatedAt, now), cancellationToken);

        // The user row is locked first; login and refresh use the same lock order.
        await _dbContext.Database.ExecuteSqlInterpolatedAsync($"""
            UPDATE refresh_tokens
            SET revoked_at = {now}
            WHERE user_id = {user.Id} AND revoked_at IS NULL
            """, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateProfileAsync(User user, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var updated = await _dbContext.Users
            .Where(candidate => candidate.Id == user.Id && candidate.DeletedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(candidate => candidate.FullName, user.FullName)
                .SetProperty(candidate => candidate.Bio, user.Bio)
                .SetProperty(candidate => candidate.CurrentAvatarAssetId, user.CurrentAvatarAssetId)
                .SetProperty(candidate => candidate.UpdatedAt, user.UpdatedAt), cancellationToken);
        if (updated != 1)
        {
            await transaction.RollbackAsync(cancellationToken);
            return false;
        }

        // Profile reads are no-tracking, so SaveChanges can persist only the
        // intentionally tracked avatar archive in the same transaction.
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return true;
    }
}
