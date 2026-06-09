using System.Collections.Concurrent;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Infrastructure.Auth;

public sealed class InMemoryUserRepository : IUserRepository
{
    private readonly ConcurrentDictionary<Guid, User> _byId = new();
    private readonly ConcurrentDictionary<string, Guid> _emailIndex = new(StringComparer.OrdinalIgnoreCase);

    public Task<bool> EmailExistsAsync(string normalizedEmail, CancellationToken cancellationToken = default) =>
        Task.FromResult(_emailIndex.ContainsKey(normalizedEmail));

    public Task<User?> GetByEmailAsync(string normalizedEmail, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_emailIndex.TryGetValue(normalizedEmail, out var id) && _byId.TryGetValue(id, out var user)
            ? user
            : null);
    }

    public Task<User?> GetByIdAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return Task.FromResult(_byId.GetValueOrDefault(userId));
    }

    public Task AddAsync(User user, CancellationToken cancellationToken = default)
    {
        if (!_emailIndex.TryAdd(user.Email, user.Id))
        {
            throw new InvalidOperationException("Email already exists.");
        }

        _byId[user.Id] = user;
        return Task.CompletedTask;
    }

    public Task UpdateAsync(User user, CancellationToken cancellationToken = default)
    {
        _byId[user.Id] = user;
        _emailIndex[user.Email] = user.Id;
        return Task.CompletedTask;
    }
}
