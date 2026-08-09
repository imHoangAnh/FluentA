using FluentA.Domain.BoundedContexts.Project.Enums;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectColumn : BaseEntity
{
    private readonly List<ProjectCard> _cards = [];

    private ProjectColumn()
    {
        Name = string.Empty;
    }

    private ProjectColumn(Guid boardId, string name, int sortOrder)
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
    public IReadOnlyList<ProjectCard> Cards => _cards.AsReadOnly();

    public static ProjectColumn Create(Guid boardId, string name, int sortOrder)
    {
        return new ProjectColumn(boardId, name, sortOrder);
    }

    public ProjectCard AddCard(
        string title,
        string? description,
        CardPriority priority,
        DateTime? deadline,
        int sortOrder)
    {
        var card = ProjectCard.Create(Id, title, description, priority, deadline, sortOrder);
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

    public void RestoreFromTrash(DateTime nowUtc, DateTime? cardTrashedAt = null)
    {
        var trashedAt = cardTrashedAt ?? DeletedAt;
        DeletedAt = null;
        UpdatedAt = nowUtc;

        if (trashedAt is null) return;
        foreach (var card in _cards.Where(card => card.DeletedAt == trashedAt))
        {
            card.RestoreFromTrash(nowUtc);
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
            throw new ArgumentException("Project column name must be between 1 and 180 characters.", nameof(name));
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
