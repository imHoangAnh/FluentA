using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Infrastructure.ContentProcessing.Journal;
using FluentA.Infrastructure.ContentProcessing.Note;

namespace FluentA.Application.UnitTests;

public sealed class JournalContentProcessorTests
{
    [Fact]
    public async Task SharedFormattingContract_PreservesH1ToH6ColorsAlignmentLists_ButDropsRemovedExtensionsAndUnsafeHtml()
    {
        var html = string.Concat(Enumerable.Range(1, 6).Select(n => $"<h{n}>Heading {n}</h{n}>"))
            + "<p style=\"text-align: center;position:absolute\"><span style=\"color:#ef4444\">Red</span><mark style=\"background-color:#fef08a\">Highlight</mark><s>Strike</s><u>Underline</u></p>"
            + "<ol start=\"3\"><li>One</li></ol><ul><li>Two</li></ul><hr>"
            + "<script>alert(1)</script><p onclick=\"bad()\">Safe</p><a href=\"javascript:bad()\">Link</a><pre><code>Code</code></pre><blockquote>Quote</blockquote><input type=\"checkbox\">";
        var journal = await new JournalContentProcessor(new TestAssetRepository()).ProcessAsync(Guid.NewGuid(), html);
        var note = await new NoteContentProcessor(new TestAssetRepository()).ProcessAsync(Guid.NewGuid(), html);
        Assert.Equal(journal.Html, note.Html);
        for (var n = 1; n <= 6; n++) Assert.Contains($"<h{n}>", journal.Html);
        foreach (var expected in new[] { "text-align", "color", "background-color", "<s>", "<u>", "<blockquote>", "<ol", "<ul>", "<li>", "<hr" }) Assert.Contains(expected, journal.Html);
        foreach (var forbidden in new[] { "<script", "onclick", "javascript:", "position:", "<a ", "<code", "<pre", "<input" }) Assert.DoesNotContain(forbidden, journal.Html);
    }

    [Theory]
    [InlineData("left")]
    [InlineData("center")]
    [InlineData("right")]
    public async Task JournalImage_RoundTripsSizeAlignmentAndDurableId_WithoutPersistingSignedUrl(string alignment)
    {
        var owner = Guid.NewGuid();
        var image = Ready(owner, AssetType.JournalImage);
        var processor = new JournalContentProcessor(new TestAssetRepository(image));
        var result = await processor.ProcessAsync(owner, $"<img data-asset-id=\"{image.Id}\" src=\"https://temporary.test/signed\" width=\"250\" height=\"125\" data-image-align=\"{alignment}\"><p>After</p>");
        Assert.DoesNotContain("src=", result.Html);
        Assert.Contains("width=\"250\"", result.Html);
        Assert.Contains("height=\"125\"", result.Html);
        Assert.Contains($"data-image-align=\"{alignment}\"", result.Html);
        Assert.Contains(image.Id, result.ReferencedAssetIds);
        var hydrated = processor.HydrateImageSources(result.Html, new Dictionary<Guid, string> { [image.Id] = "https://signed.test/new" });
        Assert.Contains("https://signed.test/new", hydrated);
        Assert.Equal(result.Html, (await processor.ProcessAsync(owner, hydrated)).Html);
    }

    [Theory]
    [InlineData("foreign")]
    [InlineData("pending")]
    [InlineData("deleted")]
    [InlineData("wrong-type")]
    [InlineData("bad-size")]
    [InlineData("bad-align")]
    [InlineData("base64")]
    public async Task JournalImage_RejectsInvalidReferencesAndLayout(string failure)
    {
        var owner = Guid.NewGuid();
        var image = Ready(failure == "foreign" ? Guid.NewGuid() : owner, failure == "wrong-type" ? AssetType.NoteImage : AssetType.JournalImage);
        if (failure == "pending") image = Asset.CreatePending(Guid.NewGuid(), owner, AssetType.JournalImage, "pending.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        if (failure == "deleted") image.MarkDeleted(DateTime.UtcNow);
        var processor = new JournalContentProcessor(new TestAssetRepository(image));
        var width = failure == "bad-size" ? "-1" : "250";
        var alignment = failure == "bad-align" ? "justify" : "center";
        var source = failure == "base64" ? "data:image/png;base64,AAAA" : "https://temporary.test/img";
        await Assert.ThrowsAsync<JournalContentValidationException>(() => processor.ProcessAsync(owner, $"<img data-asset-id=\"{image.Id}\" src=\"{source}\" width=\"{width}\" data-image-align=\"{alignment}\">"));
    }

    private static Asset Ready(Guid owner, AssetType type)
    {
        var image = Asset.CreatePending(Guid.NewGuid(), owner, type, "test.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        image.FinalizeUpload("image/png", 128);
        return image;
    }
}
