using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Application.BoundedContexts.Kanban.DTOs;
using FluentA.Domain.BoundedContexts.Kanban.Entities;
using FluentA.Domain.BoundedContexts.Kanban.Enums;

namespace FluentA.Application.UnitTests;

public sealed class KanbanServiceTests
{
    [Fact]
    public async Task CreateBoardAsync_AddsDefaultColumns()
    {
        var repository = new FakeKanbanRepository();
        var service = new KanbanService(repository);
        var userId = Guid.NewGuid();

        var result = await service.CreateBoardAsync(userId, new CreateKanbanBoardRequest(" Sprint Board "));

        Assert.True(result.IsSuccess);
        Assert.Equal("Sprint Board", result.Value!.Name);
        Assert.Equal(["To Do", "In Progress", "Done"], result.Value.Columns.Select(column => column.Name).ToArray());
        Assert.Single(repository.Boards);
    }

    [Fact]
    public async Task CreateCardAsync_ValidatesAndPersistsCard()
    {
        var repository = new FakeKanbanRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var service = new KanbanService(repository);

        var result = await service.CreateCardAsync(
            userId,
            board.Id,
            new CreateKanbanCardRequest(board.Columns[0].Id, " Build outline ", "Draft", "High", "2026-06-20"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Build outline", result.Value!.Title);
        Assert.Equal("High", result.Value.Priority);
        Assert.Equal("2026-06-20", result.Value.Deadline);
    }

    [Fact]
    public async Task DeleteColumnAsync_BlocksNonEmptyColumn()
    {
        var repository = new FakeKanbanRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new KanbanService(repository);

        var result = await service.DeleteColumnAsync(userId, board.Id, board.Columns[0].Id);

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<KanbanError>(result.Error);
        Assert.Equal("KANBAN_COLUMN_NOT_EMPTY", error.Code);
        Assert.Equal(409, error.StatusCode);
    }

    [Fact]
    public async Task MoveCardAsync_AllowsOnlyOwnedTargetColumns()
    {
        var repository = new FakeKanbanRepository();
        var notifier = new RecordingKanbanSyncNotifier();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var foreignBoard = SeedBoard(repository, foreignId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new KanbanService(repository, notifier);

        var foreignMove = await service.MoveCardAsync(ownerId, card.Id, new MoveKanbanCardRequest(foreignBoard.Columns[0].Id, 0));
        var ownedMove = await service.MoveCardAsync(ownerId, card.Id, new MoveKanbanCardRequest(board.Columns[1].Id, 3));

        Assert.False(foreignMove.IsSuccess);
        Assert.Equal("KANBAN_NOT_FOUND", Assert.IsType<KanbanError>(foreignMove.Error).Code);
        Assert.True(ownedMove.IsSuccess);
        Assert.Equal(board.Columns[1].Id, ownedMove.Value!.ColumnId);
        Assert.Equal(3, ownedMove.Value.SortOrder);
        var move = Assert.Single(notifier.Moves);
        Assert.Equal(ownerId, move.UserId);
        Assert.Equal(board.Id, move.BoardId);
        Assert.Equal(card.Id, move.CardId);
        Assert.Equal(board.Columns[0].Id, move.FromColumnId);
        Assert.Equal(board.Columns[1].Id, move.ToColumnId);
        Assert.Equal(3, move.SortOrder);
    }

    [Fact]
    public async Task MoveCardAsync_DoesNotNotifyRejectedMoves()
    {
        var repository = new FakeKanbanRepository();
        var notifier = new RecordingKanbanSyncNotifier();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var foreignBoard = SeedBoard(repository, foreignId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new KanbanService(repository, notifier);

        var result = await service.MoveCardAsync(ownerId, card.Id, new MoveKanbanCardRequest(foreignBoard.Columns[0].Id, 0));

        Assert.False(result.IsSuccess);
        Assert.Empty(notifier.Moves);
    }

    [Fact]
    public async Task UpdateAndDeleteAsync_ReturnNotFoundForForeignResources()
    {
        var repository = new FakeKanbanRepository();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new KanbanService(repository);

        var getBoard = await service.GetBoardAsync(foreignId, board.Id);
        var updateCard = await service.UpdateCardAsync(foreignId, card.Id, new UpdateKanbanCardRequest(Title: "Nope"));
        var deleteBoard = await service.DeleteBoardAsync(foreignId, board.Id);

        Assert.False(getBoard.IsSuccess);
        Assert.False(updateCard.IsSuccess);
        Assert.False(deleteBoard.IsSuccess);
        Assert.Equal("KANBAN_NOT_FOUND", Assert.IsType<KanbanError>(getBoard.Error).Code);
    }

    [Fact]
    public async Task UpdateCardAsync_ReturnsValidationErrors()
    {
        var repository = new FakeKanbanRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new KanbanService(repository);

        var result = await service.UpdateCardAsync(userId, card.Id, new UpdateKanbanCardRequest(Title: "", Priority: "Urgent", Deadline: "June"));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<KanbanError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(422, error.StatusCode);
    }

    private static KanbanBoard SeedBoard(FakeKanbanRepository repository, Guid userId)
    {
        var board = KanbanBoard.Create(userId, "Board");
        repository.Boards.Add(board);
        return board;
    }

    private sealed class FakeKanbanRepository : IKanbanRepository
    {
        public List<KanbanBoard> Boards { get; } = [];

        public Task<IReadOnlyList<KanbanBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            IReadOnlyList<KanbanBoard> boards = Boards.Where(board => board.UserId == userId && board.DeletedAt is null).ToList();
            return Task.FromResult(boards);
        }

        public Task<KanbanBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null));
        }

        public Task<KanbanColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(column => column.Id == columnId && column.DeletedAt is null);
            return Task.FromResult(column);
        }

        public Task<KanbanCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
        {
            var card = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .Where(column => column.DeletedAt is null)
                .SelectMany(column => column.Cards)
                .FirstOrDefault(card => card.Id == cardId && card.DeletedAt is null);
            return Task.FromResult(card);
        }

        public Task<KanbanColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(column => column.Id == columnId && column.DeletedAt is null);
            return Task.FromResult(column);
        }

        public Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
        {
            var sortOrder = Boards.SelectMany(board => board.Columns)
                .Where(column => column.BoardId == boardId && column.DeletedAt is null)
                .Select(column => (int?)column.SortOrder)
                .Max() ?? -1;
            return Task.FromResult(sortOrder + 1);
        }

        public Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default)
        {
            var sortOrder = Boards.SelectMany(board => board.Columns)
                .SelectMany(column => column.Cards)
                .Where(card => card.ColumnId == columnId && card.DeletedAt is null)
                .Select(card => (int?)card.SortOrder)
                .Max() ?? -1;
            return Task.FromResult(sortOrder + 1);
        }

        public Task AddBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default)
        {
            Boards.Add(board);
            return Task.CompletedTask;
        }

        public Task AddColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default)
        {
            var board = Boards.First(board => board.Id == column.BoardId);
            board.AddColumn(column.Name, column.SortOrder);
            return Task.CompletedTask;
        }

        public Task AddCardAsync(KanbanCard card, CancellationToken cancellationToken = default)
        {
            var column = Boards.SelectMany(board => board.Columns).First(column => column.Id == card.ColumnId);
            column.AddCard(card.Title, card.Description, card.Priority, card.Deadline, card.SortOrder);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateCardAsync(KanbanCard card, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class RecordingKanbanSyncNotifier : IKanbanSyncNotifier
    {
        public List<MoveRecord> Moves { get; } = [];

        public Task CardMovedAsync(
            Guid userId,
            Guid boardId,
            Guid cardId,
            Guid fromColumnId,
            Guid toColumnId,
            int sortOrder,
            CancellationToken cancellationToken = default)
        {
            Moves.Add(new MoveRecord(userId, boardId, cardId, fromColumnId, toColumnId, sortOrder));
            return Task.CompletedTask;
        }
    }

    private sealed record MoveRecord(Guid UserId, Guid BoardId, Guid CardId, Guid FromColumnId, Guid ToColumnId, int SortOrder);
}
