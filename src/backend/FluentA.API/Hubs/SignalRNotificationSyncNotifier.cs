using FluentA.Application.BoundedContexts.Notification;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

public sealed class SignalRNotificationSyncNotifier(IHubContext<SyncHub> hubContext) : INotificationSyncNotifier
{
    public Task NotificationsChangedAsync(Guid userId, CancellationToken cancellationToken = default)
        => hubContext.Clients.Group(SyncHub.UserGroup(userId))
            .SendAsync("NotificationsChanged", cancellationToken);
}
