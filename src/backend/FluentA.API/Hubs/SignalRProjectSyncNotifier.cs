using FluentA.Application.BoundedContexts.Project;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRProjectSyncNotifier : IProjectSyncNotifier
{
    private readonly IHubContext<SyncHub> _hubContext;

    public SignalRProjectSyncNotifier(IHubContext<SyncHub> hubContext)
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
            .SendAsync("ProjectCardMoved", new ProjectCardMovedMessage(boardId, cardId, fromColumnId, toColumnId, sortOrder), cancellationToken);
    }

    private sealed record ProjectCardMovedMessage(Guid BoardId, Guid CardId, Guid FromColumnId, Guid ToColumnId, int SortOrder);
}
