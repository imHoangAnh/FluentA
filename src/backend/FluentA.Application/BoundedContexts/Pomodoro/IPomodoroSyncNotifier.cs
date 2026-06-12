using FluentA.Application.BoundedContexts.Pomodoro.DTOs;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public interface IPomodoroSyncNotifier
{
    Task StateChangedAsync(Guid userId, PomodoroCurrentStateDto state, CancellationToken cancellationToken = default);
}
