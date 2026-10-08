namespace FluentA.Application.BoundedContexts.Journal;

public interface IJournalContentProcessor
{
    Task<JournalProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default);
    IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content);
    string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls);
}

public sealed record JournalProcessedContent(string Html, IReadOnlySet<Guid> ReferencedAssetIds);
