using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabBoardPreference : BaseEntity
{
    private VocabBoardPreference()
    {
        HiddenColumns = [];
        ColumnOrder = [];
        ColumnWidths = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
    }

    private VocabBoardPreference(
        Guid userId,
        Guid boardId,
        IEnumerable<string> hiddenColumns,
        IEnumerable<string> columnOrder,
        IReadOnlyDictionary<string, int> columnWidths)
        : this()
    {
        UserId = RequireIdentity(userId, nameof(userId));
        BoardId = RequireIdentity(boardId, nameof(boardId));
        Apply(hiddenColumns, columnOrder, columnWidths);
    }

    public Guid UserId { get; private set; }
    public Guid BoardId { get; private set; }
    public List<string> HiddenColumns { get; private set; }
    public List<string> ColumnOrder { get; private set; }
    public Dictionary<string, int> ColumnWidths { get; private set; }

    public static VocabBoardPreference Create(
        Guid userId,
        Guid boardId,
        IEnumerable<string> hiddenColumns,
        IEnumerable<string> columnOrder,
        IReadOnlyDictionary<string, int> columnWidths)
    {
        return new VocabBoardPreference(userId, boardId, hiddenColumns, columnOrder, columnWidths);
    }

    public void Update(
        IEnumerable<string> hiddenColumns,
        IEnumerable<string> columnOrder,
        IReadOnlyDictionary<string, int> columnWidths)
    {
        Apply(hiddenColumns, columnOrder, columnWidths);
        UpdatedAt = DateTime.UtcNow;
    }

    private void Apply(
        IEnumerable<string> hiddenColumns,
        IEnumerable<string> columnOrder,
        IReadOnlyDictionary<string, int> columnWidths)
    {
        HiddenColumns = hiddenColumns
            .Select(CleanKey)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        ColumnOrder = columnOrder
            .Select(CleanKey)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        ColumnWidths = columnWidths.ToDictionary(
            pair => CleanKey(pair.Key),
            pair => pair.Value,
            StringComparer.OrdinalIgnoreCase);
    }

    private static Guid RequireIdentity(Guid value, string name)
    {
        if (value == Guid.Empty)
        {
            throw new ArgumentException("Identity is required.", name);
        }

        return value;
    }

    private static string CleanKey(string key)
    {
        if (string.IsNullOrWhiteSpace(key))
        {
            throw new ArgumentException("Column key is required.", nameof(key));
        }

        return key.Trim();
    }
}
