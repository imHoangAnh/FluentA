using FluentA.Domain.BoundedContexts.Pomodoro.Entities;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public interface IPomodoroRepository
{
    Task<PomodoroConfig?> GetConfigAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<PomodoroConfig> AddConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default);

    Task UpdateConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default);

    Task AddSessionAsync(PomodoroSession session, CancellationToken cancellationToken = default);

    Task<int> CountCompletedWorkSessionsAsync(Guid userId, DateTime? fromUtc = null, DateTime? toUtc = null, CancellationToken cancellationToken = default);
}
