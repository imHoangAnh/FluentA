using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Project.Entities;

public sealed class ProjectBoard : BaseEntity, IAggregateRoot
{
    private readonly List<ProjectColumn> _columns = [];
    private readonly List<ProjectMilestone> _milestones = [];
    private readonly List<ProjectLabel> _labels = [];

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
    public IReadOnlyList<ProjectMilestone> Milestones => _milestones.AsReadOnly();
    public IReadOnlyList<ProjectLabel> Labels => _labels.AsReadOnly();

    public static ProjectBoard Create(Guid userId, string name)
    {
        var board = new ProjectBoard(userId, name);
        board.AddColumn("Backlog", 0);
        board.AddColumn("To Do", 1);
        board.AddColumn("In Progress", 2);
        board.AddColumn("Done", 3);
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
        var now = DateTime.SpecifyKind(nowUtc ?? DateTime.UtcNow, DateTimeKind.Utc);
        DeletedAt = now;
        UpdatedAt = now;

        foreach (var column in _columns.Where(column => column.DeletedAt is null))
        {
            column.SoftDelete(now, deleteCards: true);
        }

        foreach (var milestone in _milestones.Where(milestone => milestone.DeletedAt is null))
        {
            milestone.SoftDelete(now);
        }

        foreach (var label in _labels.Where(label => label.DeletedAt is null))
        {
            label.SoftDelete(now);
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
