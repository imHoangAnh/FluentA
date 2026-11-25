using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectCardChecklistItem : BaseEntity
{
    private ProjectCardChecklistItem()
    {
        Title = string.Empty;
    }

    private ProjectCardChecklistItem(Guid cardId, string title, int sortOrder, bool isCompleted)
    {
        if (cardId == Guid.Empty)
        {
            throw new ArgumentException("Card id is required.", nameof(cardId));
        }

        CardId = cardId;
        Title = CleanTitle(title);
        SortOrder = ValidateSortOrder(sortOrder);
        IsCompleted = isCompleted;
    }

    public Guid CardId { get; private set; }
    public string Title { get; private set; }
    public bool IsCompleted { get; private set; }
    public int SortOrder { get; private set; }

    public static ProjectCardChecklistItem Create(Guid cardId, string title, int sortOrder = 0, bool isCompleted = false)
    {
        return new ProjectCardChecklistItem(cardId, title, sortOrder, isCompleted);
    }

    public void Rename(string title)
    {
        Title = CleanTitle(title);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SetCompleted(bool isCompleted)
    {
        if (IsCompleted == isCompleted)
        {
            return;
        }

        IsCompleted = isCompleted;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Reorder(int sortOrder)
    {
        SortOrder = ValidateSortOrder(sortOrder);
        UpdatedAt = DateTime.UtcNow;
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        if (DeletedAt.HasValue)
        {
            return;
        }

        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;
    }

    private static string CleanTitle(string title)
    {
        var cleaned = title.Trim();
        if (cleaned.Length is < 1 or > 240)
        {
            throw new ArgumentException("Checklist item title must be between 1 and 240 characters.", nameof(title));
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
