using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Notification.Entities;

public sealed class Notification : BaseEntity, IAggregateRoot
{
    private Notification() { Title = Message = Type = DeduplicationKey = string.Empty; }

    private Notification(Guid userId, string type, string title, string message, string deduplicationKey, string? actionPath)
    {
        UserId = userId;
        Type = type;
        Title = title;
        Message = message;
        DeduplicationKey = deduplicationKey;
        ActionPath = CleanActionPath(actionPath);
    }

    public Guid UserId { get; private set; }
    public string Type { get; private set; }
    public string Title { get; private set; }
    public string Message { get; private set; }
    public string DeduplicationKey { get; private set; }
    public string? ActionPath { get; private set; }
    public DateTime? ReadAt { get; private set; }

    public static Notification Create(
        Guid userId,
        string type,
        string title,
        string message,
        string deduplicationKey,
        string? actionPath = null) =>
        new(userId, type, title, message, deduplicationKey, actionPath);

    public void MarkRead() => ReadAt ??= DateTime.UtcNow;

    private static string? CleanActionPath(string? actionPath)
    {
        if (actionPath is null)
        {
            return null;
        }

        if (actionPath.Length is < 1 or > 500
            || actionPath[0] != '/'
            || actionPath.StartsWith("//", StringComparison.Ordinal)
            || actionPath.Contains('\\')
            || actionPath.Any(char.IsControl)
            || Uri.TryCreate(actionPath, UriKind.Absolute, out _))
        {
            throw new ArgumentException("Notification action path must be an application-relative path.", nameof(actionPath));
        }

        return actionPath;
    }
}
