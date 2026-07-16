using FluentA.Domain.SeedWork;

namespace FluentA.Domain.BoundedContexts.Note.Entities;

public sealed class NotePageAsset : BaseEntity
{
    private NotePageAsset()
    {
    }

    private NotePageAsset(Guid notePageId, Guid assetId)
    {
        if (notePageId == Guid.Empty)
        {
            throw new ArgumentException("Note page id is required.", nameof(notePageId));
        }

        if (assetId == Guid.Empty)
        {
            throw new ArgumentException("Asset id is required.", nameof(assetId));
        }

        NotePageId = notePageId;
        AssetId = assetId;
    }

    public Guid NotePageId { get; private set; }
    public Guid AssetId { get; private set; }

    public static NotePageAsset Create(Guid notePageId, Guid assetId) => new(notePageId, assetId);
}
