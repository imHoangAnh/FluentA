using FluentA.Application.BoundedContexts.Notification.DTOs;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Application.BoundedContexts.Notification;

public sealed class NotificationService : INotificationService
{
    private readonly INotificationRepository _repository;

    public NotificationService(INotificationRepository repository) => _repository = repository;

    public async Task<OperationResult<IReadOnlyList<NotificationDto>>> ListAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var items = await _repository.ListAsync(userId, cancellationToken);
        return OperationResult<IReadOnlyList<NotificationDto>>.Success(items.Select(ToDto).ToList());
    }

    public async Task<OperationResult<NotificationUnreadCountDto>> UnreadCountAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var count = await _repository.CountUnreadAsync(userId, cancellationToken);
        return OperationResult<NotificationUnreadCountDto>.Success(new NotificationUnreadCountDto(count));
    }

    public async Task<OperationResult<NotificationReadDto>> MarkReadAsync(
        Guid userId,
        Guid notificationId,
        CancellationToken cancellationToken = default)
    {
        var item = await _repository.GetAsync(userId, notificationId, cancellationToken);
        if (item is null)
        {
            return OperationResult<NotificationReadDto>.Failure(NotificationError.NotFound());
        }

        item.MarkRead();
        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<NotificationReadDto>.Success(new NotificationReadDto(item.Id, item.ReadAt));
    }

    public async Task<OperationResult<NotificationMarkAllReadDto>> MarkAllReadAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        var items = await _repository.ListUnreadAsync(userId, cancellationToken);
        foreach (var item in items)
        {
            item.MarkRead();
        }

        await _repository.SaveChangesAsync(cancellationToken);
        return OperationResult<NotificationMarkAllReadDto>.Success(new NotificationMarkAllReadDto(items.Count));
    }

    private static NotificationDto ToDto(NotificationEntity item) =>
        new(item.Id, item.Type, item.Title, item.Message, item.ActionPath, item.ReadAt, item.CreatedAt);
}
