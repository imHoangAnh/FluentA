using FluentA.Application.BoundedContexts.Pomodoro.DTOs;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public interface IPomodoroCurrentStateStore
{
    Task<PomodoroCurrentStateSnapshot?> GetAsync(Guid userId, CancellationToken cancellationToken = default);

    Task SetAsync(Guid userId, PomodoroCurrentStateSnapshot snapshot, CancellationToken cancellationToken = default);

    Task DeleteAsync(Guid userId, CancellationToken cancellationToken = default);
}
