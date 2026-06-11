using FluentA.Application.BoundedContexts.Habit;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRHabitSyncNotifier : IHabitSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRHabitSyncNotifier(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task HabitCheckedAsync(Guid userId, Guid habitId, string date, bool isCompleted, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SyncHub.UserGroup(userId))
            .SendAsync("HabitChecked", new HabitCheckedMessage(habitId, date, isCompleted), cancellationToken);
    }

    private sealed record HabitCheckedMessage(Guid HabitId, string Date, bool IsCompleted);
}
