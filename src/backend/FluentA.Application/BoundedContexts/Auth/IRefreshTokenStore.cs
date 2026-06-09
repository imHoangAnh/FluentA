using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IRefreshTokenStore
{
    Task<RefreshTokenIssue> IssueAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<RefreshTokenSession?> FindActiveAsync(string rawToken, CancellationToken cancellationToken = default);
    Task RevokeAsync(string rawToken, CancellationToken cancellationToken = default);
    string Hash(string rawToken);
}
