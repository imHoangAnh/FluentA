using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Infrastructure.ContentProcessing.RichText;

namespace FluentA.Infrastructure.ContentProcessing.Note;

public sealed class NoteContentProcessor(IAssetRepository assets) : INoteContentProcessor
{
    private readonly AssetRichTextProcessor _processor = new(assets, AssetType.NoteImage);

    public async Task<NoteProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default)
    {
        try
        {
            var result = await _processor.ProcessAsync(userId, content, cancellationToken);
            return new NoteProcessedContent(result.Html, result.Ids);
        }
        catch (RichTextImageException exception)
        {
            throw new NoteContentValidationException(new Dictionary<string, string[]> { ["content"] = [exception.Message] });
        }
    }

    public IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content) => _processor.ExtractIds(content);
    public string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls) => _processor.Hydrate(content, assetUrls);
}
