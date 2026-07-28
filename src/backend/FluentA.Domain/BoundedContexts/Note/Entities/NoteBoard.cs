using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Note.Entities;

public sealed class NoteBoard : BaseEntity, IAggregateRoot
{
    private readonly List<NotePage> _pages = [];

    private NoteBoard()
    {
        Name = string.Empty;
    }

    private NoteBoard(Guid userId, string name)
    {
        if (userId == Guid.Empty)
        {
            throw new ArgumentException("User id is required.", nameof(userId));
        }

        UserId = userId;
        Name = CleanName(name);
    }

    public Guid UserId { get; private set; }
    public string Name { get; private set; }
    public IReadOnlyList<NotePage> Pages => _pages.AsReadOnly();

    public static NoteBoard Create(Guid userId, string name)
    {
        return new NoteBoard(userId, name);
    }

    public NotePage AddPage(string name, string? content, DateTime date)
    {
        var page = NotePage.Create(Id, name, content, date);
        _pages.Add(page);
        UpdatedAt = DateTime.UtcNow;
        return page;
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;

        foreach (var page in _pages.Where(page => page.DeletedAt is null))
        {
            page.SoftDelete(now);
        }
    }

    public void RestoreFromTrash(DateTime? nowUtc = null)
    {
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = null;
        UpdatedAt = now;
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 120)
        {
            throw new ArgumentException("Board name must be between 1 and 120 characters.", nameof(name));
        }

        return cleaned;
    }
}
