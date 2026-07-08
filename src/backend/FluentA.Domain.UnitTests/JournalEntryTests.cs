using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class JournalEntryTests
{
    [Fact]
    public void Create_NormalizesTitleContentAndDate()
    {
        var entry = JournalEntry.Create(
            Guid.NewGuid(),
            " Hoc tieng Viet ",
            new DateTime(2026, 6, 11, 16, 30, 0, DateTimeKind.Local),
            "<p>Xin chao the gioi</p>");

        Assert.Equal("Hoc tieng Viet", entry.Title);
        Assert.Equal("<p>Xin chao the gioi</p>", entry.Content);
        Assert.Equal(DateTimeKind.Utc, entry.Date.Kind);
        Assert.Equal(new DateTime(2026, 6, 11, 0, 0, 0, DateTimeKind.Utc), entry.Date);
    }

    [Fact]
    public void UpdateContentAndDate_ReplaceStoredValues()
    {
        var entry = JournalEntry.Create(Guid.NewGuid(), "Entry", new DateTime(2026, 6, 11), "<p>Original</p>");

        entry.UpdateContent("<p>Updated content</p>");
        entry.UpdateDate(new DateTime(2026, 6, 12, 14, 0, 0, DateTimeKind.Local));

        Assert.Equal("<p>Updated content</p>", entry.Content);
        Assert.Equal(new DateTime(2026, 6, 12, 0, 0, 0, DateTimeKind.Utc), entry.Date);

        entry.UpdateContent(string.Empty);

        Assert.Empty(entry.Content);
    }

    [Fact]
    public void Create_RejectsMissingOwnerAndInvalidFields()
    {
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.Empty, "Entry", new DateTime(2026, 6, 11)));
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.NewGuid(), " ", new DateTime(2026, 6, 11)));
        Assert.Throws<ArgumentException>(() => JournalEntry.Create(Guid.NewGuid(), "Entry", new DateTime(2026, 6, 11), new string('a', 100_001)));
    }
}
