namespace FluentA.Application.BoundedContexts.Note;

public interface INoteContentProcessor
{
    Task<NoteProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default);
    IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content);
    string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls);
}

public sealed record NoteProcessedContent(string Html, IReadOnlySet<Guid> ReferencedAssetIds);
