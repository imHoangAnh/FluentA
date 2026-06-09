using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabPage : BaseEntity
{
    private VocabPage()
    {
        Name = string.Empty;
    }

    private VocabPage(Guid boardId, string name, int sortOrder)
    {
        BoardId = boardId;
        Name = CleanName(name);
        SortOrder = sortOrder;
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public int SortOrder { get; private set; }

    public static VocabPage Create(Guid boardId, string name, int sortOrder)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        return new VocabPage(boardId, name, sortOrder);
    }

    public void Update(string name, int sortOrder)
    {
        Name = CleanName(name);
        SortOrder = sortOrder;
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete()
    {
        DeletedAt = DateTime.UtcNow;
        UpdatedAt = DeletedAt.Value;
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
