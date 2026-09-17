namespace FluentA.Application.BoundedContexts.Notification;

public sealed class NullNotificationSyncNotifier : INotificationSyncNotifier
{
    public static readonly NullNotificationSyncNotifier Instance = new();

    private NullNotificationSyncNotifier() { }

    public Task NotificationsChangedAsync(Guid userId, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}
