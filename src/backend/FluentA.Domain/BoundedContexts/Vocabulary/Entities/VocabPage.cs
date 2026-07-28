using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabPage : BaseEntity
{
    private VocabPage()
    {
        Name = string.Empty;
    }

    private VocabPage(Guid boardId, string name)
    {
        BoardId = boardId;
        Name = CleanName(name);
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }

    public static VocabPage Create(Guid boardId, string name)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        return new VocabPage(boardId, name);
    }

    public void Update(string name)
    {
        Name = CleanName(name);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    public void RestoreFromTrash(DateTime? nowUtc = null)
    {
        DeletedAt = null;
        UpdatedAt = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
    }

    private static string CleanName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            throw new ArgumentException("Page name must be between 1 and 120 characters.", nameof(name));
        }

        return name.Trim();
    }
}
