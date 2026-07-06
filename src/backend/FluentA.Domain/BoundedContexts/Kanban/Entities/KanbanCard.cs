using FluentA.Domain.BoundedContexts.Kanban.Enums;
using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Kanban.Entities;

public sealed class KanbanCard : BaseEntity
{
    private KanbanCard()
    {
        Title = string.Empty;
        Tags = [];
    }

    private KanbanCard(
        Guid columnId,
        string title,
        string? description,
        CardPriority priority,
        DateTime? deadline,
        int sortOrder,
        IReadOnlyList<string> tags)
    {
        if (columnId == Guid.Empty)
        {
            throw new ArgumentException("Column id is required.", nameof(columnId));
        }

        ColumnId = columnId;
        Title = CleanTitle(title);
        Description = CleanDescription(description);
        Priority = priority;
        Deadline = NormalizeDeadline(deadline);
        SortOrder = ValidateSortOrder(sortOrder);
        Tags = CleanTags(tags);
    }

    public Guid ColumnId { get; private set; }
    public string Title { get; private set; }
    public string? Description { get; private set; }
    public CardPriority Priority { get; private set; }
    public DateTime? Deadline { get; private set; }
    public int SortOrder { get; private set; }
    public string[] Tags { get; private set; }

    public static KanbanCard Create(
        Guid columnId,
        string title,
        string? description,
        CardPriority priority,
        DateTime? deadline,
        int sortOrder,
        IReadOnlyList<string> tags)
    {
        return new KanbanCard(columnId, title, description, priority, deadline, sortOrder, tags);
    }

    public void Update(
        string? title,
        string? description,
        CardPriority? priority,
        DateTime? deadline,
        IReadOnlyList<string>? tags,
        bool clearDeadline)
    {
        if (title is not null)
        {
            Title = CleanTitle(title);
        }

        if (description is not null)
        {
            Description = CleanDescription(description);
        }

        if (priority is not null)
        {
            Priority = priority.Value;
        }

        if (clearDeadline)
        {
            Deadline = null;
        }
        else if (deadline is not null)
        {
            Deadline = NormalizeDeadline(deadline);
        }

        if (tags is not null)
        {
            Tags = CleanTags(tags);
        }

        Touch();
    }

    public void MoveToColumn(Guid columnId, int sortOrder)
    {
        if (columnId == Guid.Empty)
        {
            throw new ArgumentException("Column id is required.", nameof(columnId));
        }

        ColumnId = columnId;
        SortOrder = ValidateSortOrder(sortOrder);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;
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
            throw new ArgumentException("Kanban card title must be between 1 and 240 characters.", nameof(title));
        }

        return cleaned;
    }

    private static string? CleanDescription(string? description)
    {
        if (string.IsNullOrWhiteSpace(description))
        {
            return null;
        }

        var cleaned = description.Trim();
        if (cleaned.Length > 4000)
        {
            throw new ArgumentException("Kanban card description must be at most 4000 characters.", nameof(description));
        }

        return cleaned;
    }

    private static DateTime? NormalizeDeadline(DateTime? deadline)
    {
        return deadline is null ? null : DateTime.SpecifyKind(deadline.Value.Date, DateTimeKind.Utc);
    }

    private static int ValidateSortOrder(int sortOrder)
    {
        return sortOrder < 0
            ? throw new ArgumentOutOfRangeException(nameof(sortOrder), "Sort order must be zero or greater.")
            : sortOrder;
    }

    private static string[] CleanTags(IReadOnlyList<string> tags)
    {
        var cleaned = tags
            .Select(tag => tag.Trim())
            .Where(tag => tag.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (cleaned.Length > 12)
        {
            throw new ArgumentException("A Kanban card can have at most 12 tags.", nameof(tags));
        }

        if (cleaned.Any(tag => tag.Length > 40))
        {
            throw new ArgumentException("Kanban card tags must be at most 40 characters.", nameof(tags));
        }

        return cleaned;
    }
}
