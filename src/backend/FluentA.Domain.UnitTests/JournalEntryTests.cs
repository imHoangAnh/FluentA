using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class JournalEntryTests
{
    [Fact]
    public void Create_CleansUnicodeFieldsAndBuildsBoundedPreview()
    {
        var entry = JournalEntry.Create(
            Guid.NewGuid(),
            " Học tiếng Việt ",
            "<p>Xin chào thế giới</p>",
            "  Xin chào\n\nthế giới " + new string('a', 120),
            new DateTime(2026, 6, 11, 16, 30, 0));

        Assert.Equal("Học tiếng Việt", entry.Title);
        Assert.StartsWith("Xin chào thế giới", entry.Preview);
        Assert.Equal(100, entry.Preview.Length);
        Assert.Equal(DateTimeKind.Utc, entry.LearningDate!.Value.Kind);
        Assert.Equal(new DateTime(2026, 6, 11), entry.LearningDate.Value.Date);
    }

    [Fact]
    public void UpdateContent_RebuildsPreviewAndSupportsEmptyContent()
    {
        var entry = JournalEntry.Create(Guid.NewGuid(), "Entry", "<p>Original</p>", "Original");

        entry.UpdateContent("<p>Updated content</p>", " Updated content ");
        Assert.Equal("<p>Updated content</p>", entry.Content);
        Assert.Equal(" Updated content ", entry.PlainTextContent);
        Assert.Equal("Updated content", entry.Preview);

        entry.UpdateContent(string.Empty, string.Empty);
        Assert.Empty(entry.Content);
        Assert.Empty(entry.Preview);
    }

    [Fact]
    public void Create_RejectsMissingOwnerAndInvalidFields()
    {
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.Empty, "Entry"));
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.NewGuid(), " "));
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.NewGuid(), "Entry", new string('a', 100_001)));
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.NewGuid(), "Entry", string.Empty, new string('a', 100_001)));
    }
}
