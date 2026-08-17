using FluentA.Domain.BoundedContexts.Notification.Entities;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Application.BoundedContexts.Notification;

public interface INotificationRepository
{
    Task<IReadOnlyList<NotificationEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<NotificationEntity?> GetAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<NotificationEntity>> ListUnreadAsync(Guid userId, CancellationToken cancellationToken = default);
    Task SaveChangesAsync(CancellationToken cancellationToken = default);
}
