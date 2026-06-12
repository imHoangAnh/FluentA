using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRPomodoroSyncNotifier : IPomodoroSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRPomodoroSyncNotifier(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task StateChangedAsync(Guid userId, PomodoroCurrentStateDto state, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SyncHub.UserGroup(userId))
            .SendAsync("PomodoroSync", state, cancellationToken);
    }
}
