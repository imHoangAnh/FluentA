using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Infrastructure.Auth;

public sealed class InMemoryRefreshTokenStore : IRefreshTokenStore
{
    private readonly ConcurrentDictionary<string, RefreshTokenSession> _sessionsByHash = new();

    public Task<RefreshTokenIssue> IssueAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var session = new RefreshTokenSession(
            Guid.NewGuid(),
            userId,
            Hash(rawToken),
            DateTime.UtcNow.AddDays(7),
            RevokedAt: null);

        _sessionsByHash[session.TokenHash] = session;
        return Task.FromResult(new RefreshTokenIssue(rawToken, session.ExpiresAt));
    }

    public Task<RefreshTokenSession?> FindActiveAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        var hash = Hash(rawToken);
        if (!_sessionsByHash.TryGetValue(hash, out var session))
        {
            return Task.FromResult<RefreshTokenSession?>(null);
        }

        var isActive = session.RevokedAt is null && session.ExpiresAt > DateTime.UtcNow;
        return Task.FromResult(isActive ? session : null);
    }

    public Task RevokeAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        var hash = Hash(rawToken);
        if (_sessionsByHash.TryGetValue(hash, out var session))
        {
            _sessionsByHash[hash] = session with { RevokedAt = DateTime.UtcNow };
        }

        return Task.CompletedTask;
    }

    public string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }
}
