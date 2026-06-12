using FluentA.Application.BoundedContexts.Pomodoro.DTOs;

namespace FluentA.Application.BoundedContexts.Pomodoro;

public sealed class NullPomodoroSyncNotifier : IPomodoroSyncNotifier
{
    public static NullPomodoroSyncNotifier Instance { get; } = new();

    private NullPomodoroSyncNotifier()
    {
    }

    public Task StateChangedAsync(Guid userId, PomodoroCurrentStateDto state, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
