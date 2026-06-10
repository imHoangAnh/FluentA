using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabCustomColumn : BaseEntity
{
    private VocabCustomColumn()
    {
        Name = string.Empty;
    }

    private VocabCustomColumn(Guid boardId, string name, CustomColumnType type, int sortOrder)
    {
        BoardId = boardId;
        Name = CleanName(name);
        Type = type;
        SortOrder = sortOrder;
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public CustomColumnType Type { get; private set; }
    public int SortOrder { get; private set; }

    public static VocabCustomColumn Create(Guid boardId, string name, CustomColumnType type, int sortOrder)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        return new VocabCustomColumn(boardId, name, type, sortOrder);
    }

    private static string CleanName(string name)
    {
        if (string.IsNullOrWhiteSpace(name) || name.Trim().Length > 120)
        {
            throw new ArgumentException("Column name must be between 1 and 120 characters.", nameof(name));
        }

        return name.Trim();
    }
}
