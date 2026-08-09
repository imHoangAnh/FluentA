using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Domain.BoundedContexts.Project.Enums;

namespace FluentA.Domain.UnitTests;

public sealed class ProjectTests
{
    [Fact]
    public void CreateBoard_AddsDefaultColumns()
    {
        var board = ProjectBoard.Create(Guid.NewGuid(), " Language Project ");

        Assert.Equal("Language Project", board.Name);
        Assert.Equal(["To Do", "In Progress", "Done"], board.Columns.Select(column => column.Name).ToArray());
        Assert.Equal([0, 1, 2], board.Columns.Select(column => column.SortOrder).ToArray());
    }

    [Fact]
    public void Card_NormalizesFieldsAndMoves()
    {
        var columnId = Guid.NewGuid();
        var targetColumnId = Guid.NewGuid();
        var deadline = new DateTime(2026, 6, 18, 14, 30, 0, DateTimeKind.Local);
        var card = ProjectCard.Create(
            columnId,
            " Draft lesson ",
            "  Write plan  ",
            CardPriority.High,
            deadline,
            2);

        Assert.Equal("Draft lesson", card.Title);
        Assert.Equal("Write plan", card.Description);
        Assert.Equal(CardPriority.High, card.Priority);
        Assert.Equal(new DateTime(2026, 6, 18, 0, 0, 0, DateTimeKind.Utc), card.Deadline);

        card.MoveToColumn(targetColumnId, 0);

        Assert.Equal(targetColumnId, card.ColumnId);
        Assert.Equal(0, card.SortOrder);
    }

    [Fact]
    public void ProjectEntities_ValidateRequiredFieldsAndSoftDeleteChildren()
    {
        Assert.Throws<ArgumentException>(() => ProjectBoard.Create(Guid.Empty, "Board"));
        Assert.Throws<ArgumentException>(() => ProjectBoard.Create(Guid.NewGuid(), ""));
        Assert.Throws<ArgumentException>(() => ProjectColumn.Create(Guid.NewGuid(), new string('x', 181), 0));
        Assert.Throws<ArgumentException>(() => ProjectCard.Create(Guid.NewGuid(), "", null, CardPriority.Low, null, 0));

        var board = ProjectBoard.Create(Guid.NewGuid(), "Board");
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);

        board.SoftDelete();

        Assert.NotNull(board.DeletedAt);
        Assert.All(board.Columns, column => Assert.NotNull(column.DeletedAt));
        Assert.NotNull(card.DeletedAt);
    }
}
