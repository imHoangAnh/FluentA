namespace FluentA.Application.BoundedContexts.Notification;

public interface INotificationSyncNotifier
{
    Task NotificationsChangedAsync(Guid userId, CancellationToken cancellationToken = default);
}
