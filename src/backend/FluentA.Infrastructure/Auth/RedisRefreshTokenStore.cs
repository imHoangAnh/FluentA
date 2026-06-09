using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using StackExchange.Redis;

namespace FluentA.Infrastructure.Auth;

public sealed class RedisRefreshTokenStore : IRefreshTokenStore
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);
    private readonly IDatabase _database;

    public RedisRefreshTokenStore(IConnectionMultiplexer connectionMultiplexer)
    {
        _database = connectionMultiplexer.GetDatabase();
    }

    public async Task<RefreshTokenIssue> IssueAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        var expiresAt = DateTime.UtcNow.Add(Lifetime);
        var session = new RefreshTokenSession(Guid.NewGuid(), userId, Hash(rawToken), expiresAt, RevokedAt: null);

        await _database.StringSetAsync(Key(session.TokenHash), JsonSerializer.Serialize(session), Lifetime);

        return new RefreshTokenIssue(rawToken, expiresAt);
    }

    public async Task<RefreshTokenSession?> FindActiveAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        var tokenHash = Hash(rawToken);
        var value = await _database.StringGetAsync(Key(tokenHash));
        if (!value.HasValue)
        {
            return null;
        }

        var session = JsonSerializer.Deserialize<RefreshTokenSession>((string)value!);
        if (session is null || session.RevokedAt is not null || session.ExpiresAt <= DateTime.UtcNow)
        {
            return null;
        }

        return session;
    }

    public async Task RevokeAsync(string rawToken, CancellationToken cancellationToken = default)
    {
        await _database.KeyDeleteAsync(Key(Hash(rawToken)));
    }

    public string Hash(string rawToken)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));
        return Convert.ToHexString(bytes);
    }

    private static string Key(string tokenHash) => $"auth:refresh:{tokenHash}";
}
