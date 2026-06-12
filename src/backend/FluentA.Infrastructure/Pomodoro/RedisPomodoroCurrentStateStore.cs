using System.Text.Json;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using StackExchange.Redis;

namespace FluentA.Infrastructure.Pomodoro;

public sealed class RedisPomodoroCurrentStateStore : IPomodoroCurrentStateStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly IConnectionMultiplexer _connectionMultiplexer;

    public RedisPomodoroCurrentStateStore(IConnectionMultiplexer connectionMultiplexer)
    {
        _connectionMultiplexer = connectionMultiplexer;
    }

    public async Task<PomodoroCurrentStateSnapshot?> GetAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var database = _connectionMultiplexer.GetDatabase();
        var value = await database.StringGetAsync(Key(userId));
        cancellationToken.ThrowIfCancellationRequested();

        if (value.IsNullOrEmpty)
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<PomodoroCurrentStateSnapshot>((string)value!, JsonOptions);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public async Task SetAsync(Guid userId, PomodoroCurrentStateSnapshot snapshot, CancellationToken cancellationToken = default)
    {
        var database = _connectionMultiplexer.GetDatabase();
        var value = JsonSerializer.Serialize(snapshot, JsonOptions);
        await database.StringSetAsync(Key(userId), value, TimeSpan.FromDays(2));
        cancellationToken.ThrowIfCancellationRequested();
    }

    public async Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var database = _connectionMultiplexer.GetDatabase();
        await database.KeyDeleteAsync(Key(userId));
        cancellationToken.ThrowIfCancellationRequested();
    }

    private static string Key(Guid userId) => $"pomodoro:current:{userId:N}";
}
