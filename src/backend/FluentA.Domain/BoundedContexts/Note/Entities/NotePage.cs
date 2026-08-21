using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Note.Entities;

public sealed class NotePage : BaseEntity
{
    public const int ContentMaxLength = 100_000;

    private NotePage()
    {
        Name = string.Empty;
        Content = string.Empty;
    }

    private NotePage(Guid boardId, string name, string? content, DateTime date)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        BoardId = boardId;
        Name = CleanName(name);
        Content = CleanContent(content);
        Date = NormalizeDate(date);
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public string Content { get; private set; }
    public DateTime Date { get; private set; }

    public static NotePage Create(Guid boardId, string name, string? content, DateTime date)
    {
        return new NotePage(boardId, name, content, date);
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateContent(string? content)
    {
        Content = CleanContent(content);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;
    }

    public void RestoreFromTrash(DateTime? nowUtc = null)
    {
        if (DeletedAt is null)
        {
            return;
        }

        DeletedAt = null;
        UpdatedAt = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Page name must be between 1 and 240 characters.", nameof(name));
        }

        return cleaned;
    }

    private static string CleanContent(string? content)
    {
        var cleaned = content ?? string.Empty;
        if (cleaned.Length > ContentMaxLength)
        {
            throw new ArgumentException($"Note content must be at most {ContentMaxLength} characters.", nameof(content));
        }

        return cleaned;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
