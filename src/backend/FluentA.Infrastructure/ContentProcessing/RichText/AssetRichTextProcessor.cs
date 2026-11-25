using System.Globalization;
using AngleSharp.Html.Parser;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using Ganss.Xss;

namespace FluentA.Infrastructure.ContentProcessing.RichText;

// One HTML contract for the shared Journal/Notes editor.
internal sealed class AssetRichTextProcessor(IAssetRepository assets, AssetType imageType)
{
    private const string AssetAttribute = "data-asset-id";
    private readonly HtmlParser _parser = new();

    public async Task<(string Html, IReadOnlySet<Guid> Ids)> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken)
    {
        if (_parser.ParseDocument(content ?? "").QuerySelectorAll("img").Any(image => (image.GetAttribute("src") ?? "").StartsWith("data:", StringComparison.OrdinalIgnoreCase)))
            throw new RichTextImageException("Embedded base64 images are not allowed.");
        var sanitizer = new HtmlSanitizer();
        sanitizer.AllowedTags.Clear();
        foreach (var tag in new[] { "p", "br", "h1", "h2", "h3", "h4", "h5", "h6", "strong", "b", "em", "i", "u", "s", "blockquote", "ul", "ol", "li", "mark", "hr", "span", "img" })
            sanitizer.AllowedTags.Add(tag);
        sanitizer.AllowedAttributes.Clear();
        foreach (var attribute in new[] { "style", "src", "alt", "width", "height", "start", AssetAttribute, "data-note-asset-id", "data-image-align" })
            sanitizer.AllowedAttributes.Add(attribute);
        sanitizer.AllowedCssProperties.Clear();
        foreach (var property in new[] { "color", "background-color", "text-align" })
            sanitizer.AllowedCssProperties.Add(property);

        var document = _parser.ParseDocument($"<body>{sanitizer.Sanitize(content ?? string.Empty)}</body>");
        var images = document.Body!.QuerySelectorAll("img");
        var ids = new HashSet<Guid>();
        foreach (var image in images)
        {
            var idValue = image.GetAttribute(AssetAttribute) ?? image.GetAttribute("data-note-asset-id");
            if (!Guid.TryParse(idValue, out var id) || (image.GetAttribute("src") ?? "").StartsWith("data:", StringComparison.OrdinalIgnoreCase))
                throw new RichTextImageException("Images must reference an uploaded owned asset; base64 images are not allowed.");
            ids.Add(id);
            image.SetAttribute(AssetAttribute, id.ToString());
            image.RemoveAttribute("data-note-asset-id");
            image.RemoveAttribute("src");
            image.RemoveAttribute("style");
            var alignment = image.GetAttribute("data-image-align") ?? "left";
            if (alignment is not ("left" or "center" or "right"))
                throw new RichTextImageException("Image alignment must be left, center or right.");
            image.SetAttribute("data-image-align", alignment);
            foreach (var dimension in new[] { "width", "height" })
            {
                var value = image.GetAttribute(dimension);
                if (value is null) continue;
                if (!int.TryParse(value, NumberStyles.None, CultureInfo.InvariantCulture, out var size) || size is < 1 or > 4096)
                    throw new RichTextImageException("Image dimensions must be integers between 1 and 4096 pixels.");
                image.SetAttribute(dimension, size.ToString(CultureInfo.InvariantCulture));
            }
            var alt = image.GetAttribute("alt")?.Trim() ?? "";
            image.SetAttribute("alt", alt.Length > 240 ? alt[..240] : alt);
        }
        var owned = (await assets.GetOwnedAsync(userId, ids.ToArray(), cancellationToken)).ToDictionary(asset => asset.Id);
        if (ids.Any(id => !owned.TryGetValue(id, out var asset) || asset.Type != imageType || asset.Status != AssetStatus.Ready || asset.DeletedAt is not null))
            throw new RichTextImageException("Images must use owned finalized uploads of the correct type.");
        return (document.Body.InnerHtml, ids);
    }

    public IReadOnlySet<Guid> ExtractIds(string? content) => _parser.ParseDocument($"<body>{content ?? ""}</body>")
        .QuerySelectorAll("img").Select(image => image.GetAttribute(AssetAttribute) ?? image.GetAttribute("data-note-asset-id"))
        .Where(value => Guid.TryParse(value, out _)).Select(value => Guid.Parse(value!)).ToHashSet();

    public string Hydrate(string? content, IReadOnlyDictionary<Guid, string> urls)
    {
        var document = _parser.ParseDocument($"<body>{content ?? ""}</body>");
        foreach (var image in document.QuerySelectorAll("img"))
        {
            if (Guid.TryParse(image.GetAttribute(AssetAttribute) ?? image.GetAttribute("data-note-asset-id"), out var id) && urls.TryGetValue(id, out var url))
                image.SetAttribute("src", url);
            else image.RemoveAttribute("src");
        }
        return document.Body!.InnerHtml;
    }
}

internal sealed class RichTextImageException(string message) : Exception(message);
