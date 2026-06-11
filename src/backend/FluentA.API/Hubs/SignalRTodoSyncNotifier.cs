using FluentA.Application.BoundedContexts.Todo;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRTodoSyncNotifier : ITodoSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRTodoSyncNotifier(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task TodoItemCheckedAsync(Guid userId, Guid todoId, bool isCompleted, CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SyncHub.UserGroup(userId))
            .SendAsync("TodoItemChecked", new TodoItemCheckedMessage(todoId, isCompleted), cancellationToken);
    }

    private sealed record TodoItemCheckedMessage(Guid TodoId, bool IsCompleted);
}
