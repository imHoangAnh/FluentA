using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectBoard : BaseEntity, IAggregateRoot
{
    private readonly List<ProjectColumn> _columns = [];

    private ProjectBoard()
    {
        Name = string.Empty;
    }

    private ProjectBoard(Guid userId, string name)
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
    public IReadOnlyList<ProjectColumn> Columns => _columns.AsReadOnly();

    public static ProjectBoard Create(Guid userId, string name)
    {
        var board = new ProjectBoard(userId, name);
        board.AddColumn("To Do", 0);
        board.AddColumn("In Progress", 1);
        board.AddColumn("Done", 2);
        return board;
    }

    public ProjectColumn AddColumn(string name, int sortOrder)
    {
        var column = ProjectColumn.Create(Id, name, sortOrder);
        _columns.Add(column);
        Touch();
        return column;
    }

    public void Rename(string name)
    {
        Name = CleanName(name);
        Touch();
    }

    public void SoftDelete(DateTime? nowUtc = null)
    {
        var now = nowUtc ?? DateTime.UtcNow;
        DeletedAt = now;
        UpdatedAt = now;

        foreach (var column in _columns.Where(column => column.DeletedAt is null))
        {
            column.SoftDelete(now, deleteCards: true);
        }
    }

    public void RestoreFromTrash(DateTime nowUtc)
    {
        var trashedAt = DeletedAt;
        DeletedAt = null;
        UpdatedAt = nowUtc;

        if (trashedAt is null) return;
        foreach (var column in _columns.Where(column => column.DeletedAt == trashedAt))
        {
            column.RestoreFromTrash(nowUtc, trashedAt.Value);
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
            throw new ArgumentException("Project board name must be between 1 and 180 characters.", nameof(name));
        }

        return cleaned;
    }
}
