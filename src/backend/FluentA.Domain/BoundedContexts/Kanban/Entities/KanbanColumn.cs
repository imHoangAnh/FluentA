using FluentA.Domain.BoundedContexts.Kanban.Enums;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Kanban.Entities;

public sealed class KanbanColumn : BaseEntity
{
    private readonly List<KanbanCard> _cards = [];

    private KanbanColumn()
    {
        Name = string.Empty;
    }

    private KanbanColumn(Guid boardId, string name, int sortOrder)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        BoardId = boardId;
        Name = CleanName(name);
        SortOrder = ValidateSortOrder(sortOrder);
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public int SortOrder { get; private set; }
    public IReadOnlyList<KanbanCard> Cards => _cards.AsReadOnly();

    public static KanbanColumn Create(Guid boardId, string name, int sortOrder)
    {
        return new KanbanColumn(boardId, name, sortOrder);
    }

    public KanbanCard AddCard(
        string title,
        string? description,
        CardPriority priority,
        DateTime? deadline,
        int sortOrder)
    {
        var card = KanbanCard.Create(Id, title, description, priority, deadline, sortOrder);
        _cards.Add(card);
        Touch();
        return card;
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        Touch();
    }

    public void Reorder(int sortOrder)
    {
        SortOrder = ValidateSortOrder(sortOrder);
        Touch();
    }

    public bool HasActiveCards()
    {
        return _cards.Any(card => card.DeletedAt is null);
    }

    public void SoftDelete(DateTime? nowUtc = null, bool deleteCards = false)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;

        if (!deleteCards)
        {
            return;
        }

        foreach (var card in _cards.Where(card => card.DeletedAt is null))
        {
            card.SoftDelete(now);
        }
    }

    private void Touch()
    {
        UpdatedAt = DateTime.UtcNow;
    }

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 180)
        {
            throw new ArgumentException("Kanban column name must be between 1 and 180 characters.", nameof(name));
        }

        return cleaned;
    }

    private static int ValidateSortOrder(int sortOrder)
    {
        return sortOrder < 0
            ? throw new ArgumentOutOfRangeException(nameof(sortOrder), "Sort order must be zero or greater.")
            : sortOrder;
    }
}
