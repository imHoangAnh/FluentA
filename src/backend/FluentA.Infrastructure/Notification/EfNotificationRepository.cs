using FluentA.Application.BoundedContexts.Notification;
using FluentA.Domain.BoundedContexts.Notification.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using NotificationEntity = FluentA.Domain.BoundedContexts.Notification.Entities.Notification;

namespace FluentA.Infrastructure.Notification;

public sealed class EfNotificationRepository : INotificationRepository
{
    private readonly AppDbContext _db;

    public EfNotificationRepository(AppDbContext db) => _db = db;

    public async Task<IReadOnlyList<NotificationEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _db.Notifications
            .Where(x => x.UserId == userId && x.DeletedAt == null)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

    public Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken = default) =>
        _db.Notifications.CountAsync(
            x => x.UserId == userId && x.DeletedAt == null && x.ReadAt == null,
            cancellationToken);

    public Task<NotificationEntity?> GetAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default) =>
        _db.Notifications.FirstOrDefaultAsync(
            x => x.Id == notificationId && x.UserId == userId && x.DeletedAt == null,
            cancellationToken);

    public async Task<IReadOnlyList<NotificationEntity>> ListUnreadAsync(Guid userId, CancellationToken cancellationToken = default) =>
        await _db.Notifications
            .Where(x => x.UserId == userId && x.DeletedAt == null && x.ReadAt == null)
            .ToListAsync(cancellationToken);

    public Task SaveChangesAsync(CancellationToken cancellationToken = default) =>
        _db.SaveChangesAsync(cancellationToken);
}
