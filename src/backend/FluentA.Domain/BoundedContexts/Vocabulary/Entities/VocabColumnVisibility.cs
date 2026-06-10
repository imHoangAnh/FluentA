using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Vocabulary.Entities;

public sealed class VocabColumnVisibility : BaseEntity
{
    private VocabColumnVisibility()
    {
        ColumnKey = string.Empty;
    }

    private VocabColumnVisibility(Guid userId, Guid boardId, string columnKey)
    {
        UserId = userId;
        BoardId = boardId;
        ColumnKey = CleanKey(columnKey);
    }

    public Guid UserId { get; private set; }
    public Guid BoardId { get; private set; }
    public string ColumnKey { get; private set; }

    public static VocabColumnVisibility Create(Guid userId, Guid boardId, string columnKey)
    {
        if (userId == Guid.Empty || boardId == Guid.Empty)
        {
            throw new ArgumentException("User id and board id are required.");
        }

        return new VocabColumnVisibility(userId, boardId, columnKey);
    }

    private static string CleanKey(string columnKey)
    {
        var cleaned = columnKey.Trim().ToLowerInvariant();
        if (cleaned.Length is < 1 or > 80)
        {
            throw new ArgumentException("Column key must be between 1 and 80 characters.", nameof(columnKey));
        }

        return cleaned;
    }
}
