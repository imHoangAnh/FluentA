using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace FluentA.Infrastructure.Pomodoro;

public sealed class MemoryPomodoroCurrentStateStore : IPomodoroCurrentStateStore
{
    private readonly IMemoryCache _cache;

    public MemoryPomodoroCurrentStateStore(IMemoryCache cache)
    {
        _cache = cache;
    }

    public Task<PomodoroCurrentStateSnapshot?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (_cache.TryGetValue(Key(userId), out PomodoroCurrentStateSnapshot? snapshot))
        {
            return Task.FromResult(snapshot);
        }

        return Task.FromResult<PomodoroCurrentStateSnapshot?>(null);
    }

    public Task SetAsync(Guid userId, PomodoroCurrentStateSnapshot snapshot, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(2)
        };
        _cache.Set(Key(userId), snapshot, options);
        return Task.CompletedTask;
    }

    public Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        _cache.Remove(Key(userId));
        return Task.CompletedTask;
    }

    private static string Key(Guid userId) => $"pomodoro:current:{userId:N}";
}
