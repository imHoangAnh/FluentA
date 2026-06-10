using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.Hubs;

[Authorize]
public sealed class SyncHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? Context.User?.FindFirstValue("sub");

        if (!Guid.TryParse(userId, out var id))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(Context.ConnectionId, UserGroup(id));
        await base.OnConnectedAsync();
    }

    public static string UserGroup(Guid userId) => $"user:{userId:N}";
}
