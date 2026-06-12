using FluentA.Domain.BoundedContexts.Kanban.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class KanbanTests
{
    [Fact]
    public void CreateBoard_AddsDefaultColumns()
    {
        var board = KanbanBoard.Create(Guid.NewGuid(), " Language Project ");

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
        var card = KanbanCard.Create(
            columnId,
            " Draft lesson ",
            "  Write plan  ",
            CardPriority.High,
            deadline,
            2,
            [" Study ", "study", "Project"]);

        Assert.Equal("Draft lesson", card.Title);
        Assert.Equal("Write plan", card.Description);
        Assert.Equal(CardPriority.High, card.Priority);
        Assert.Equal(new DateTime(2026, 6, 18, 0, 0, 0, DateTimeKind.Utc), card.Deadline);
        Assert.Equal(["Study", "Project"], card.Tags);

        card.MoveToColumn(targetColumnId, 0);

        Assert.Equal(targetColumnId, card.ColumnId);
        Assert.Equal(0, card.SortOrder);
    }

    [Fact]
    public void KanbanEntities_ValidateRequiredFieldsAndSoftDeleteChildren()
    {
        Assert.Throws<ArgumentException>(() => KanbanBoard.Create(Guid.Empty, "Board"));
        Assert.Throws<ArgumentException>(() => KanbanBoard.Create(Guid.NewGuid(), ""));
        Assert.Throws<ArgumentException>(() => KanbanColumn.Create(Guid.NewGuid(), new string('x', 181), 0));
        Assert.Throws<ArgumentException>(() => KanbanCard.Create(Guid.NewGuid(), "", null, CardPriority.Low, null, 0, []));
        Assert.Throws<ArgumentException>(() => KanbanCard.Create(Guid.NewGuid(), "Card", null, CardPriority.Low, null, 0, Enumerable.Range(0, 13).Select(index => $"tag-{index}").ToArray()));

        var board = KanbanBoard.Create(Guid.NewGuid(), "Board");
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0, []);

        board.SoftDelete();

        Assert.NotNull(board.DeletedAt);
        Assert.All(board.Columns, column => Assert.NotNull(column.DeletedAt));
        Assert.NotNull(card.DeletedAt);
    }
}
