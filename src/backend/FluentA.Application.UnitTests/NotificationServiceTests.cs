using FluentA.Application.BoundedContexts.Notification;
using FluentA.Domain.BoundedContexts.Notification.Entities;

namespace FluentA.Application.UnitTests;

public sealed class NotificationServiceTests
{
    [Fact]
    public async Task ListAndUnreadCount_ReturnOnlyOwnedActiveNotifications()
    {
        var repository = new FakeNotificationRepository();
        var service = new NotificationService(repository);
        var ownerId = Guid.NewGuid();
        repository.Add(Notification.Create(ownerId, "Type", "Owned", "Message", "owned"));
        repository.Add(Notification.Create(Guid.NewGuid(), "Type", "Foreign", "Message", "foreign"));

        var listed = await service.ListAsync(ownerId);
        var count = await service.UnreadCountAsync(ownerId);

        Assert.True(listed.IsSuccess);
        Assert.Single(listed.Value!);
        Assert.Equal("Owned", listed.Value![0].Title);
        Assert.Equal(1, count.Value!.Count);
    }

    [Fact]
    public async Task MarkRead_EnforcesOwnershipAndPersistsTheState()
    {
        var repository = new FakeNotificationRepository();
        var service = new NotificationService(repository);
        var ownerId = Guid.NewGuid();
        var item = Notification.Create(ownerId, "Type", "Owned", "Message", "owned");
        repository.Add(item);

        var foreign = await service.MarkReadAsync(Guid.NewGuid(), item.Id);
        var marked = await service.MarkReadAsync(ownerId, item.Id);

        Assert.False(foreign.IsSuccess);
        Assert.Equal("NOTIFICATION_NOT_FOUND", ((NotificationError)foreign.Error!).Code);
        Assert.True(marked.IsSuccess);
        Assert.NotNull(marked.Value!.ReadAt);
        Assert.Equal(1, repository.SaveCount);
    }

    [Fact]
    public async Task MarkAllRead_ReturnsChangedCount()
    {
        var repository = new FakeNotificationRepository();
        var service = new NotificationService(repository);
        var ownerId = Guid.NewGuid();
        repository.Add(Notification.Create(ownerId, "Type", "One", "Message", "one"));
        repository.Add(Notification.Create(ownerId, "Type", "Two", "Message", "two"));

        var result = await service.MarkAllReadAsync(ownerId);

        Assert.True(result.IsSuccess);
        Assert.Equal(2, result.Value!.Count);
        Assert.Equal(1, repository.SaveCount);
        Assert.Equal(0, (await service.UnreadCountAsync(ownerId)).Value!.Count);
    }

    private sealed class FakeNotificationRepository : INotificationRepository
    {
        private readonly List<Notification> _items = [];

        public int SaveCount { get; private set; }

        public void Add(Notification item) => _items.Add(item);

        public Task<IReadOnlyList<Notification>> ListAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Notification>>(_items
                .Where(item => item.UserId == userId && item.DeletedAt is null)
                .OrderByDescending(item => item.CreatedAt)
                .ToList());

        public Task<int> CountUnreadAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_items.Count(item => item.UserId == userId && item.DeletedAt is null && item.ReadAt is null));

        public Task<Notification?> GetAsync(Guid userId, Guid notificationId, CancellationToken cancellationToken = default) =>
            Task.FromResult(_items.FirstOrDefault(item => item.UserId == userId && item.Id == notificationId && item.DeletedAt is null));

        public Task<IReadOnlyList<Notification>> ListUnreadAsync(Guid userId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<Notification>>(_items
                .Where(item => item.UserId == userId && item.DeletedAt is null && item.ReadAt is null)
                .ToList());

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            SaveCount++;
            return Task.CompletedTask;
        }
    }
}
