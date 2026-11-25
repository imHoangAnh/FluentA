using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectMilestone : BaseEntity
{
    private ProjectMilestone()
    {
        Name = string.Empty;
        NormalizedName = string.Empty;
    }

    private ProjectMilestone(Guid boardId, string name, int sortOrder)
    {
        if (boardId == Guid.Empty)
        {
            throw new ArgumentException("Board id is required.", nameof(boardId));
        }

        var cleanName = CleanName(name);
        BoardId = boardId;
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
        SortOrder = ValidateSortOrder(sortOrder);
    }

    public Guid BoardId { get; private set; }
    public string Name { get; private set; }
    public string NormalizedName { get; private set; }
    public int SortOrder { get; private set; }

    public static ProjectMilestone Create(Guid boardId, string name, int sortOrder = 0)
    {
        return new ProjectMilestone(boardId, name, sortOrder);
    }

    public void Rename(string name)
    {
        var cleanName = CleanName(name);
        Name = cleanName;
        NormalizedName = cleanName.ToLowerInvariant();
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

    private static string CleanName(string name)
    {
        var cleaned = name.Trim();
        if (cleaned.Length is < 1 or > 120)
        {
            throw new ArgumentException("Project milestone name must be between 1 and 120 characters.", nameof(name));
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
