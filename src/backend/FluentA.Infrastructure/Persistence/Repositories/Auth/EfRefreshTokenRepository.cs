using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.Persistence.Repositories.Auth;

public sealed class EfRefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _dbContext;

    public EfRefreshTokenRepository(AppDbContext dbContext) => _dbContext = dbContext;

    public async Task<AccessTokenIssue?> TryCreateForPasswordLoginAsync(
        Guid userId,
        string tokenHash,
        DateTime createdAt,
        DateTime expiresAt,
        string expectedPasswordHash,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var user = await _dbContext.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE id = {userId} FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        if (user is null || user.DeletedAt is not null || !user.IsEmailVerified
            || !string.Equals(user.PasswordHash, expectedPasswordHash, StringComparison.Ordinal))
        {
            return null;
        }

        var updated = await _dbContext.Users
            .Where(candidate => candidate.Id == userId && candidate.EmailVerifiedAt != null && candidate.PasswordHash == expectedPasswordHash)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(candidate => candidate.LastLoginAt, createdAt)
                .SetProperty(candidate => candidate.UpdatedAt, createdAt), cancellationToken);
        if (updated != 1) return null;

        var accessToken = issueAccessToken(userId);
        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            CreatedAt = createdAt,
            ExpiresAt = expiresAt
        });
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return accessToken;
    }

    public async Task<GoogleLoginSessionResult> TryCreateForGoogleLoginAsync(
        string normalizedEmail,
        string fullName,
        string googleSubject,
        string tokenHash,
        DateTime createdAt,
        DateTime expiresAt,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var user = await LockUserByEmailAsync(normalizedEmail, cancellationToken);
        if (user is null)
        {
            var newId = Guid.NewGuid();
            int inserted;
            try
            {
                inserted = await _dbContext.Database.ExecuteSqlInterpolatedAsync($"""
                    INSERT INTO users (
                        id, email, full_name, bio, current_avatar_asset_id, password_hash, google_id,
                        email_verified_at, otp_hash, otp_expires_at, reset_password_token_hash,
                        reset_password_expires_at, last_login_at, created_at, updated_at, deleted_at)
                    VALUES (
                        {newId}, {normalizedEmail}, {fullName}, {string.Empty}, NULL, NULL, {googleSubject},
                        {createdAt}, NULL, NULL, NULL, NULL, {createdAt}, {createdAt}, {createdAt}, NULL)
                    ON CONFLICT (email) DO NOTHING
                    """, cancellationToken);
            }
            catch (PostgresException exception) when (IsGoogleSubjectConflict(exception))
            {
                return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);
            }

            // A concurrent Google login may have inserted the address. Re-read it with
            // the same user-before-token lock order before linking or issuing credentials.
            user = inserted == 1
                ? await LockUserByIdAsync(newId, cancellationToken)
                : await LockUserByEmailAsync(normalizedEmail, cancellationToken);
            if (user is null) return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);
        }

        if (user.DeletedAt is not null)
            return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);

        if (user.GoogleId is not null && !string.Equals(user.GoogleId, googleSubject, StringComparison.Ordinal))
        {
            return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);
        }

        try
        {
            await _dbContext.Database.ExecuteSqlInterpolatedAsync($"""
                UPDATE users
                SET google_id = {googleSubject},
                    email_verified_at = COALESCE(email_verified_at, {createdAt}),
                    otp_hash = NULL,
                    otp_expires_at = NULL,
                    last_login_at = {createdAt},
                    updated_at = {createdAt}
                WHERE id = {user.Id}
                """, cancellationToken);
        }
        catch (PostgresException exception) when (IsGoogleSubjectConflict(exception))
        {
            return new GoogleLoginSessionResult(GoogleLoginResult.AccountConflict, null);
        }
        var accessToken = issueAccessToken(user.Id);
        await AddRefreshTokenAsync(user.Id, tokenHash, createdAt, expiresAt, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new GoogleLoginSessionResult(GoogleLoginResult.Authenticated, accessToken);
    }

    public async Task<RefreshResponse?> IssueAccessTokenAsync(
        string tokenHash,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var userId = await _dbContext.RefreshTokens.AsNoTracking()
            .Where(token => token.TokenHash == tokenHash)
            .Select(token => (Guid?)token.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (userId is null) return null;

        var user = await LockUserByIdAsync(userId.Value, cancellationToken);
        if (user is null || user.DeletedAt is not null || !user.IsEmailVerified) return null;
        var token = await _dbContext.RefreshTokens
            .FromSqlInterpolated($"SELECT * FROM refresh_tokens WHERE token_hash = {tokenHash} FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        var checkedAt = DateTime.UtcNow;
        if (token is null || token.UserId != user.Id || token.RevokedAt is not null || token.ExpiresAt <= checkedAt)
        {
            return null;
        }

        var issue = issueAccessToken(user.Id);
        await transaction.CommitAsync(cancellationToken);
        return new RefreshResponse(issue.Token, issue.ExpiresAtUtc);
    }

    public async Task RevokeAsync(string tokenHash, CancellationToken cancellationToken = default)
    {
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var userId = await _dbContext.RefreshTokens.AsNoTracking()
            .Where(token => token.TokenHash == tokenHash)
            .Select(token => (Guid?)token.UserId)
            .SingleOrDefaultAsync(cancellationToken);
        if (userId is null) return;

        // All operations that can touch both rows acquire the user row before a token row.
        var user = await LockUserByIdAsync(userId.Value, cancellationToken);
        if (user is null) return;
        var token = await _dbContext.RefreshTokens
            .FromSqlInterpolated($"SELECT * FROM refresh_tokens WHERE token_hash = {tokenHash} AND user_id = {userId.Value} FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);
        if (token is not null && token.RevokedAt is null)
        {
            var revokedAt = DateTime.UtcNow;
            await _dbContext.RefreshTokens
                .Where(candidate => candidate.Id == token.Id && candidate.RevokedAt == null)
                .ExecuteUpdateAsync(setters => setters.SetProperty(candidate => candidate.RevokedAt, revokedAt), cancellationToken);
        }

        await transaction.CommitAsync(cancellationToken);
    }

    private Task<User?> LockUserByIdAsync(Guid userId, CancellationToken cancellationToken) =>
        _dbContext.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE id = {userId} FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);

    private Task<User?> LockUserByEmailAsync(string normalizedEmail, CancellationToken cancellationToken) =>
        _dbContext.Users
            .FromSqlInterpolated($"SELECT * FROM users WHERE email = {normalizedEmail} FOR UPDATE")
            .AsNoTracking()
            .SingleOrDefaultAsync(cancellationToken);

    private async Task AddRefreshTokenAsync(Guid userId, string tokenHash, DateTime createdAt, DateTime expiresAt, CancellationToken cancellationToken)
    {
        _dbContext.RefreshTokens.Add(new RefreshToken
        {
            UserId = userId,
            TokenHash = tokenHash,
            CreatedAt = createdAt,
            ExpiresAt = expiresAt
        });
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    private static bool IsGoogleSubjectConflict(PostgresException exception) =>
        exception.SqlState == PostgresErrorCodes.UniqueViolation
        && string.Equals(exception.ConstraintName, "IX_users_google_id", StringComparison.Ordinal);
}
