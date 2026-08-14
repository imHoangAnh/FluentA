using FluentA.Application.BoundedContexts.Notification.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Notification;

public interface INotificationService
{
    Task<OperationResult<IReadOnlyList<NotificationDto>>> ListAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<NotificationUnreadCountDto>> UnreadCountAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<OperationResult<NotificationReadDto>> MarkReadAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default);
    Task<OperationResult<NotificationMarkAllReadDto>> MarkAllReadAsync(Guid userId, CancellationToken cancellationToken = default);
}
