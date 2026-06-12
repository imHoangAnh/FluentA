using System.Text;
using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using FluentA.Application.BoundedContexts.Journal;
using Ganss.Xss;

namespace FluentA.Infrastructure.Journal;

public sealed class JournalContentProcessor : IJournalContentProcessor
{
    private static readonly string[] SupportedTags =
    [
        "p", "br", "h1", "h2", "h3", "strong", "b", "em", "i", "u", "s",
        "ul", "ol", "li", "blockquote", "pre", "code", "mark", "a", "hr", "span"
    ];
    private static readonly HashSet<string> TextBoundaryTags = new(StringComparer.OrdinalIgnoreCase)
    {
        "p", "br", "h1", "h2", "h3", "li", "blockquote", "pre", "hr"
    };

    private readonly HtmlSanitizer _sanitizer;
    private readonly HtmlParser _parser = new();

    public JournalContentProcessor()
    {
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
    }

    public JournalProcessedContent Process(string? content)
    {
        var sanitized = _sanitizer.Sanitize(content ?? string.Empty);
        var document = _parser.ParseDocument($"<body>{sanitized}</body>");
        var plainText = new StringBuilder();
        if (document.Body is not null)
        {
            AppendText(document.Body, plainText);
        }

        return new JournalProcessedContent(sanitized, plainText.ToString());
    }

    private static void AppendText(INode node, StringBuilder output)
    {
        if (node is IText text)
        {
            output.Append(text.Data);
            return;
        }

        foreach (var child in node.ChildNodes)
        {
            AppendText(child, output);
        }

        if (node is IElement element && TextBoundaryTags.Contains(element.LocalName))
        {
            output.Append(' ');
        }
    }
}
