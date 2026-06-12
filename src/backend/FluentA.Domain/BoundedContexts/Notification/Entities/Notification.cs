using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Notification.Entities;

public sealed class Notification : BaseEntity, IAggregateRoot
{
    private Notification() { Title = Message = Type = DeduplicationKey = string.Empty; }

    private Notification(Guid userId, string type, string title, string message, string deduplicationKey)
    {
        UserId = userId;
        Type = type;
        Title = title;
        Message = message;
        DeduplicationKey = deduplicationKey;
    }

    public Guid UserId { get; private set; }
    public string Type { get; private set; }
    public string Title { get; private set; }
    public string Message { get; private set; }
    public string DeduplicationKey { get; private set; }
    public DateTime? ReadAt { get; private set; }

    public static Notification Create(Guid userId, string type, string title, string message, string deduplicationKey) =>
        new(userId, type, title, message, deduplicationKey);

    public void MarkRead() => ReadAt ??= DateTime.UtcNow;
}
