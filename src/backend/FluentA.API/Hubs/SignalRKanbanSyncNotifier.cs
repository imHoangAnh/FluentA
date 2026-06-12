using FluentA.Application.BoundedContexts.Kanban;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRKanbanSyncNotifier : IKanbanSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRKanbanSyncNotifier(IHubContext<SyncHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task CardMovedAsync(
        Guid userId,
        Guid boardId,
        Guid cardId,
        Guid fromColumnId,
        Guid toColumnId,
        int sortOrder,
        CancellationToken cancellationToken = default)
    {
        return _hubContext.Clients
            .Group(SyncHub.UserGroup(userId))
            .SendAsync("KanbanCardMoved", new KanbanCardMovedMessage(boardId, cardId, fromColumnId, toColumnId, sortOrder), cancellationToken);
    }

    private sealed record KanbanCardMovedMessage(Guid BoardId, Guid CardId, Guid FromColumnId, Guid ToColumnId, int SortOrder);
}
