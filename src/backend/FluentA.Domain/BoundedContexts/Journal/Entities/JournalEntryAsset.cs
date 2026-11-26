using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Journal.Entities;

public sealed class JournalEntryAsset : BaseEntity
{
    private JournalEntryAsset()
    {
    }

    private JournalEntryAsset(Guid journalEntryId, Guid assetId)
    {
        if (journalEntryId == Guid.Empty)
        {
            throw new ArgumentException("Journal entry id is required.", nameof(journalEntryId));
        }

        if (assetId == Guid.Empty)
        {
            throw new ArgumentException("Asset id is required.", nameof(assetId));
        }

        JournalEntryId = journalEntryId;
        AssetId = assetId;
    }

    public Guid JournalEntryId { get; private set; }
    public Guid AssetId { get; private set; }

    public void SoftDelete(DateTime nowUtc)
    {
        if (DeletedAt is not null) return;
        DeletedAt = nowUtc;
        UpdatedAt = nowUtc;
    }

    public static JournalEntryAsset Create(Guid journalEntryId, Guid assetId) => new(journalEntryId, assetId);
}
