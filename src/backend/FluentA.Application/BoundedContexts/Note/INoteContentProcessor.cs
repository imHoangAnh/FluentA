namespace FluentA.Application.BoundedContexts.Note;

public interface INoteContentProcessor
{
    Task<NoteProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default);
    IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content);
}

public sealed record NoteProcessedContent(string Html, IReadOnlySet<Guid> ReferencedAssetIds);
