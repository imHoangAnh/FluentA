using FluentA.Domain.BoundedContexts.Note.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class NoteTests
{
    [Fact]
    public void BoardAndPage_CreateNormalizeValues()
    {
        var board = NoteBoard.Create(Guid.NewGuid(), " Learning Notes ");
        var page = board.AddPage(" Daily Reflection ", "<p>Hello</p>", new DateTime(2026, 7, 9, 14, 0, 0, DateTimeKind.Local));

        Assert.Equal("Learning Notes", board.Name);
        Assert.Equal("Daily Reflection", page.Name);
        Assert.Equal("<p>Hello</p>", page.Content);
        Assert.Equal(new DateTime(2026, 7, 9, 0, 0, 0, DateTimeKind.Utc), page.Date);
    }

    [Fact]
    public void Page_UpdateAndBoardDeleteApplyLifecycle()
    {
        var board = NoteBoard.Create(Guid.NewGuid(), "Board");
        var page = board.AddPage("Page", "<p>Original</p>", DateTime.UtcNow);

        page.UpdateContent("<p>Updated</p>");
        page.Rename("Renamed");
        board.SoftDelete();

        Assert.Equal("Renamed", page.Name);
        Assert.Equal("<p>Updated</p>", page.Content);
        Assert.NotNull(board.DeletedAt);
        Assert.NotNull(page.DeletedAt);
    }

    [Fact]
    public void Create_RejectsInvalidFields()
    {
        Assert.Throws<ArgumentException>(() => NoteBoard.Create(Guid.Empty, "Board"));
        Assert.Throws<ArgumentException>(() => NoteBoard.Create(Guid.NewGuid(), " "));
        Assert.Throws<ArgumentException>(() => NotePage.Create(Guid.NewGuid(), " ", string.Empty, DateTime.UtcNow));
        Assert.Throws<ArgumentException>(() => NotePage.Create(Guid.NewGuid(), "Page", new string('a', 100_001), DateTime.UtcNow));
    }
}
