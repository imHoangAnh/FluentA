using System.Text.RegularExpressions;
using AngleSharp.Dom;
using AngleSharp.Html.Dom;
using AngleSharp.Html.Parser;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using Ganss.Xss;

namespace FluentA.Infrastructure.Note;

public sealed partial class NoteContentProcessor : INoteContentProcessor
{
    private const string AssetIdAttribute = "data-note-asset-id";
    private static readonly string[] SupportedTags =
    [
        "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s",
        "ul", "ol", "li", "blockquote", "pre", "code", "mark", "a", "hr", "span", "img"
    ];

    private static readonly Regex Base64ImagePattern = Base64ImageRegex();

    private readonly HtmlSanitizer _sanitizer;
    private readonly HtmlParser _parser = new();
    private readonly IAssetRepository _assets;

    public NoteContentProcessor(IAssetRepository assets)
    {
        _assets = assets;
        _sanitizer = new HtmlSanitizer();
        _sanitizer.AllowedTags.Clear();
        foreach (var tag in SupportedTags)
        {
            _sanitizer.AllowedTags.Add(tag);
        }

        _sanitizer.AllowedAttributes.Clear();
        _sanitizer.AllowedAttributes.Add("href");
        _sanitizer.AllowedAttributes.Add("target");
        _sanitizer.AllowedAttributes.Add("rel");
        _sanitizer.AllowedAttributes.Add("class");
        _sanitizer.AllowedAttributes.Add("src");
        _sanitizer.AllowedAttributes.Add("alt");
        _sanitizer.AllowedAttributes.Add(AssetIdAttribute);
    }

    public async Task<NoteProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default)
    {
        var sanitized = _sanitizer.Sanitize(content ?? string.Empty);
        if (Base64ImagePattern.IsMatch(sanitized))
        {
            throw new NoteContentValidationException(new Dictionary<string, string[]>
            {
                ["content"] = ["Embedded base64 images are not allowed in notes."]
            });
        }

        var document = _parser.ParseDocument($"<body>{sanitized}</body>");
        var images = document.Body?.QuerySelectorAll("img").OfType<IHtmlImageElement>().ToList() ?? [];
        var referencedIds = new HashSet<Guid>();

        foreach (var image in images)
        {
            var assetIdText = image.GetAttribute(AssetIdAttribute);
            if (!Guid.TryParse(assetIdText, out var assetId))
            {
                throw new NoteContentValidationException(new Dictionary<string, string[]>
                {
                    ["content"] = ["Note images must reference an uploaded owned asset."]
                });
            }

            referencedIds.Add(assetId);
        }

        var ownedAssets = (await _assets.GetOwnedAsync(userId, referencedIds.ToArray(), cancellationToken))
            .ToDictionary(asset => asset.Id);

        foreach (var assetId in referencedIds)
        {
            if (!ownedAssets.TryGetValue(assetId, out var asset)
                || asset.Type != AssetType.NoteImage
                || asset.Status != AssetStatus.Finalized)
            {
                throw new NoteContentValidationException(new Dictionary<string, string[]>
                {
                    ["content"] = ["Note images must use owned finalized note-image uploads."]
                });
            }
        }

        foreach (var image in images)
        {
            var assetId = Guid.Parse(image.GetAttribute(AssetIdAttribute)!);
            var asset = ownedAssets[assetId];
            image.Source = asset.PublicUrl;

            var alt = image.AlternativeText?.Trim() ?? string.Empty;
            image.AlternativeText = alt.Length > 240 ? alt[..240] : alt;
        }

        return new NoteProcessedContent(document.Body?.InnerHtml ?? string.Empty, referencedIds);
    }

    public IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content)
    {
        var document = _parser.ParseDocument($"<body>{content ?? string.Empty}</body>");
        var ids = new HashSet<Guid>();

        foreach (var image in document.Body?.QuerySelectorAll("img").OfType<IHtmlImageElement>() ?? [])
        {
            if (Guid.TryParse(image.GetAttribute(AssetIdAttribute), out var assetId))
            {
                ids.Add(assetId);
            }
        }

        return ids;
    }

    [GeneratedRegex("data:image/[^;]+;base64,", RegexOptions.IgnoreCase | RegexOptions.CultureInvariant)]
    private static partial Regex Base64ImageRegex();
}
