using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Domain.BoundedContexts.Project.Enums;

namespace FluentA.Application.UnitTests;

public sealed class ProjectServiceTests
{
    [Fact]
    public async Task CreateBoardAsync_AddsDefaultColumns()
    {
        var repository = new FakeProjectRepository();
        var service = new ProjectService(repository);
        var userId = Guid.NewGuid();

        var result = await service.CreateBoardAsync(userId, new CreateProjectBoardRequest(" Sprint Board "));

        Assert.True(result.IsSuccess);
        Assert.Equal("Sprint Board", result.Value!.Name);
        Assert.Equal(["To Do", "In Progress", "Done"], result.Value.Columns.Select(column => column.Name).ToArray());
        Assert.Single(repository.Boards);
    }

    [Fact]
    public async Task CreateCardAsync_ValidatesAndPersistsCard()
    {
        var repository = new FakeProjectRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var service = new ProjectService(repository);

        var result = await service.CreateCardAsync(
            userId,
            board.Id,
            new CreateProjectCardRequest(board.Columns[0].Id, " Build outline ", "Draft", "High", "2026-06-20"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Build outline", result.Value!.Title);
        Assert.Equal("High", result.Value.Priority);
        Assert.Equal("2026-06-20", result.Value.Deadline);
    }

    [Fact]
    public async Task DeleteColumnAsync_BlocksNonEmptyColumn()
    {
        var repository = new FakeProjectRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository);

        var result = await service.DeleteColumnAsync(userId, board.Id, board.Columns[0].Id);

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<ProjectError>(result.Error);
        Assert.Equal("PROJECT_COLUMN_NOT_EMPTY", error.Code);
        Assert.Equal(409, error.StatusCode);
    }

    [Fact]
    public async Task MoveCardAsync_AllowsOnlyOwnedTargetColumns()
    {
        var repository = new FakeProjectRepository();
        var notifier = new RecordingProjectSyncNotifier();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var foreignBoard = SeedBoard(repository, foreignId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository, notifier);

        var foreignMove = await service.MoveCardAsync(ownerId, card.Id, new MoveProjectCardRequest(foreignBoard.Columns[0].Id, 0));
        var ownedMove = await service.MoveCardAsync(ownerId, card.Id, new MoveProjectCardRequest(board.Columns[1].Id, 3));

        Assert.False(foreignMove.IsSuccess);
        Assert.Equal("PROJECT_NOT_FOUND", Assert.IsType<ProjectError>(foreignMove.Error).Code);
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
        var repository = new FakeProjectRepository();
        var notifier = new RecordingProjectSyncNotifier();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var foreignBoard = SeedBoard(repository, foreignId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository, notifier);

        var result = await service.MoveCardAsync(ownerId, card.Id, new MoveProjectCardRequest(foreignBoard.Columns[0].Id, 0));

        Assert.False(result.IsSuccess);
        Assert.Empty(notifier.Moves);
    }

    [Fact]
    public async Task UpdateAndDeleteAsync_ReturnNotFoundForForeignResources()
    {
        var repository = new FakeProjectRepository();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository);

        var getBoard = await service.GetBoardAsync(foreignId, board.Id);
        var updateCard = await service.UpdateCardAsync(foreignId, card.Id, new UpdateProjectCardRequest(Title: "Nope"));
        var deleteBoard = await service.DeleteBoardAsync(foreignId, board.Id);

        Assert.False(getBoard.IsSuccess);
        Assert.False(updateCard.IsSuccess);
        Assert.False(deleteBoard.IsSuccess);
        Assert.Equal("PROJECT_NOT_FOUND", Assert.IsType<ProjectError>(getBoard.Error).Code);
    }

    [Fact]
    public async Task UpdateCardAsync_ReturnsValidationErrors()
    {
        var repository = new FakeProjectRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository);

        var result = await service.UpdateCardAsync(userId, card.Id, new UpdateProjectCardRequest(Title: "", Priority: "Urgent", Deadline: "June"));

        Assert.False(result.IsSuccess);
        var error = Assert.IsType<ProjectError>(result.Error);
        Assert.Equal("VALIDATION_ERROR", error.Code);
        Assert.Equal(422, error.StatusCode);
    }

    private static ProjectBoard SeedBoard(FakeProjectRepository repository, Guid userId)
    {
        var board = ProjectBoard.Create(userId, "Board");
        repository.Boards.Add(board);
        return board;
    }

    private sealed class FakeProjectRepository : IProjectRepository
    {
        public List<ProjectBoard> Boards { get; } = [];

        public Task<IReadOnlyList<ProjectBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            IReadOnlyList<ProjectBoard> boards = Boards.Where(board => board.UserId == userId && board.DeletedAt is null).ToList();
            return Task.FromResult(boards);
        }

        public Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null));
        }

        public Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(column => column.Id == columnId && column.DeletedAt is null);
            return Task.FromResult(column);
        }

        public Task<ProjectCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
        {
            var card = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .Where(column => column.DeletedAt is null)
                .SelectMany(column => column.Cards)
                .FirstOrDefault(card => card.Id == cardId && card.DeletedAt is null);
            return Task.FromResult(card);
        }

        public Task<ProjectColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(column => column.Id == columnId && column.DeletedAt is null);
            return Task.FromResult(column);
        }

        public Task<ProjectBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
            Task.FromResult(Boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt == trashedAt));

        public Task<ProjectColumn?> GetTrashedColumnAsync(Guid userId, Guid columnId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
            Task.FromResult(Boards.Where(board => board.UserId == userId && board.DeletedAt is null).SelectMany(board => board.Columns).FirstOrDefault(column => column.Id == columnId && column.DeletedAt == trashedAt));

        public Task<ProjectCard?> GetTrashedCardAsync(Guid userId, Guid cardId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
            Task.FromResult(Boards.Where(board => board.UserId == userId && board.DeletedAt is null).SelectMany(board => board.Columns).Where(column => column.DeletedAt is null).SelectMany(column => column.Cards).FirstOrDefault(card => card.Id == cardId && card.DeletedAt == trashedAt));

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

        public Task AddBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
        {
            Boards.Add(board);
            return Task.CompletedTask;
        }

        public Task AddColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
        {
            var board = Boards.First(board => board.Id == column.BoardId);
            board.AddColumn(column.Name, column.SortOrder);
            return Task.CompletedTask;
        }

        public Task AddCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
        {
            var column = Boards.SelectMany(board => board.Columns).First(column => column.Id == card.ColumnId);
            column.AddCard(card.Title, card.Description, card.Priority, card.Deadline, card.SortOrder);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task RemoveBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
        {
            Boards.Remove(board);
            return Task.CompletedTask;
        }

        public Task RemoveColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task RemoveCardAsync(ProjectCard card, CancellationToken cancellationToken = default) => Task.CompletedTask;
    }

    private sealed class RecordingProjectSyncNotifier : IProjectSyncNotifier
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
