using FluentA.API.Hubs;
using Microsoft.AspNetCore.SignalR;

namespace FluentA.API.UnitTests;

public sealed class NotificationSyncNotifierTests
{
    [Fact]
    public async Task NotificationChangeIsSentOnlyToOwnersGroupWithoutPrivatePayload()
    {
        var context = new RecordingHubContext();
        var owner = Guid.NewGuid();

        await new SignalRNotificationSyncNotifier(context).NotificationsChangedAsync(owner);

        Assert.Equal(SyncHub.UserGroup(owner), context.Recorder.GroupName);
        Assert.Equal("NotificationsChanged", context.Recorder.Method);
        Assert.Empty(context.Recorder.Arguments!);
    }

    private sealed class RecordingHubContext : IHubContext<SyncHub>
    {
        public RecordingClients Recorder { get; } = new();
        public IHubClients Clients => Recorder;
        public IGroupManager Groups => throw new NotSupportedException();
    }

    private sealed class RecordingClients : IHubClients, IClientProxy
    {
        public string? GroupName { get; private set; }
        public string? Method { get; private set; }
        public object?[]? Arguments { get; private set; }

        public IClientProxy Group(string groupName)
        {
            GroupName = groupName;
            return this;
        }

        public Task SendCoreAsync(string method, object?[] args, CancellationToken cancellationToken = default)
        {
            Method = method;
            Arguments = args;
            return Task.CompletedTask;
        }

        public IClientProxy All => throw new NotSupportedException("Notifications must never broadcast to all users.");
        public IClientProxy AllExcept(IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Client(string connectionId) => throw new NotSupportedException();
        public IClientProxy Clients(IReadOnlyList<string> connectionIds) => throw new NotSupportedException();
        public IClientProxy GroupExcept(string groupName, IReadOnlyList<string> excludedConnectionIds) => throw new NotSupportedException();
        public IClientProxy Groups(IReadOnlyList<string> groupNames) => throw new NotSupportedException();
        public IClientProxy User(string userId) => throw new NotSupportedException();
        public IClientProxy Users(IReadOnlyList<string> userIds) => throw new NotSupportedException();
    }
}
