using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Journal.Entities;

public sealed class JournalEntry : BaseEntity, IAggregateRoot
{
    private JournalEntry()
    {
        Title = string.Empty;
        Content = string.Empty;
    }

    private JournalEntry(Guid userId, string title, string? content, DateTime date)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Title = CleanTitle(title);
        Content = CleanContent(content);
        Date = NormalizeDate(date);
    }

    public Guid UserId { get; private set; }
    public string Title { get; private set; }
    public string Content { get; private set; }
    public DateTime Date { get; private set; }

    public static JournalEntry Create(Guid userId, string title, DateTime date, string? content = null)
    {
        return new JournalEntry(userId, title, content, date);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        Touch();
    }

    public void UpdateContent(string? content)
    {
        Content = CleanContent(content);
        Touch();
    }

    public void UpdateDate(DateTime date)
    {
        Date = NormalizeDate(date);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        DeletedAt = nowUtc ?? DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
    }

    public void RestoreFromTrash(DateTime nowUtc)
    {
        DeletedAt = null;
        UpdatedAt = nowUtc;
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Journal title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static string CleanContent(string? content)
    {
        var cleaned = content ?? string.Empty;
        if (cleaned.Length > 100_000)
        {
            throw new ArgumentException("Journal content must be at most 100000 characters.", nameof(content));
        }

        return cleaned;
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
