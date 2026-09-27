using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IRefreshTokenRepository
{
    Task<AccessTokenIssue?> TryCreateForPasswordLoginAsync(
        Guid userId,
        string tokenHash,
        DateTime createdAt,
        DateTime expiresAt,
        string expectedPasswordHash,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default);

    Task<GoogleLoginSessionResult> TryCreateForGoogleLoginAsync(
        string normalizedEmail,
        string fullName,
        string googleSubject,
        string tokenHash,
        DateTime createdAt,
        DateTime expiresAt,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default);

    Task<RefreshResponse?> IssueAccessTokenAsync(
        string tokenHash,
        Func<Guid, AccessTokenIssue> issueAccessToken,
        CancellationToken cancellationToken = default);

    Task RevokeAsync(string tokenHash, CancellationToken cancellationToken = default);
}
