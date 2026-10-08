using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Infrastructure.ContentProcessing.RichText;

namespace FluentA.Infrastructure.ContentProcessing.Journal;

public sealed class JournalContentProcessor(IAssetRepository assets) : IJournalContentProcessor
{
    private readonly AssetRichTextProcessor _processor = new(assets, AssetType.JournalImage);

    public async Task<JournalProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processor.ProcessAsync(userId, content, cancellationToken);
            return new JournalProcessedContent(result.Html, result.Ids);
        }
        catch (RichTextImageException exception)
        {
            throw new JournalContentValidationException(new Dictionary<string, string[]> { ["content"] = [exception.Message] });
        }
    }

    public IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content) => _processor.ExtractIds(content);
    public string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls) => _processor.Hydrate(content, assetUrls);
}
