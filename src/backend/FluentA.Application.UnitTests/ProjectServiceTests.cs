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
        Assert.Equal(["Backlog", "To Do", "In Progress", "Done"], result.Value.Columns.Select(column => column.Name).ToArray());
        Assert.Single(repository.Boards);
    }

    [Fact]
    public async Task CreateCardAsync_ValidatesAndPersistsCardWithMilestoneLabelAndChecklist()
    {
        var repository = new FakeProjectRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var service = new ProjectService(repository);
        var milestone = await service.CreateMilestoneAsync(userId, board.Id, new CreateProjectMilestoneRequest("Milestone M1"));
        var label = await service.CreateLabelAsync(userId, board.Id, new CreateProjectLabelRequest("#Notes", "info"));

        var result = await service.CreateCardAsync(
            userId,
            board.Id,
            new CreateProjectCardRequest(
                board.Columns[0].Id,
                " Build outline ",
                "Draft",
                "High",
                "2026-06-20",
                milestone.Value!.Id,
                label.Value!.Id,
                ["Step 1", "Step 2"]));

        Assert.True(result.IsSuccess);
        Assert.Equal("Build outline", result.Value!.Title);
        Assert.Equal("High", result.Value.Priority);
        Assert.Equal("2026-06-20", result.Value.Deadline);
        Assert.Equal("Milestone M1", result.Value.Milestone?.Name);
        Assert.Equal("#Notes", result.Value.Label?.Name);
        Assert.Equal("info", result.Value.Label?.Tone);
        Assert.Equal(2, result.Value.ChecklistItems!.Count);
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
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var foreignBoard = SeedBoard(repository, foreignId);
        var card = board.Columns[0].AddCard("Card", null, CardPriority.Medium, null, 0);
        var service = new ProjectService(repository);

        var foreignMove = await service.MoveCardAsync(ownerId, card.Id, new MoveProjectCardRequest(foreignBoard.Columns[0].Id, 0));
        var ownedMove = await service.MoveCardAsync(ownerId, card.Id, new MoveProjectCardRequest(board.Columns[1].Id, 3));

        Assert.False(foreignMove.IsSuccess);
        Assert.Equal("PROJECT_NOT_FOUND", Assert.IsType<ProjectError>(foreignMove.Error).Code);
        Assert.True(ownedMove.IsSuccess);
        Assert.Equal(board.Columns[1].Id, ownedMove.Value!.ColumnId);
        Assert.Equal(3, ownedMove.Value.SortOrder);
        Assert.Equal(board.Columns[1].Id, card.ColumnId);
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
        Assert.Equal(400, error.StatusCode);
    }

    [Fact]
    public async Task MilestonesAndLabels_CreateUpdateDelete_EnforcesDuplicatesAndClearsCards()
    {
        var repository = new FakeProjectRepository();
        var userId = Guid.NewGuid();
        var board = SeedBoard(repository, userId);
        var otherBoard = SeedBoard(repository, userId);
        var service = new ProjectService(repository);

        var milestone = await service.CreateMilestoneAsync(userId, board.Id, new CreateProjectMilestoneRequest("M1"));
        var duplicateMilestone = await service.CreateMilestoneAsync(userId, board.Id, new CreateProjectMilestoneRequest("m1"));
        var label = await service.CreateLabelAsync(userId, board.Id, new CreateProjectLabelRequest("#API", "warning"));
        var duplicateLabel = await service.CreateLabelAsync(userId, board.Id, new CreateProjectLabelRequest("#api", "primary"));
        var foreignLabel = await service.CreateLabelAsync(userId, otherBoard.Id, new CreateProjectLabelRequest("Other", "neutral"));

        var invalidCrossBoard = await service.CreateCardAsync(userId, board.Id, new CreateProjectCardRequest(
            board.Columns[0].Id,
            "Invalid",
            LabelId: foreignLabel.Value!.Id));
        var created = await service.CreateCardAsync(userId, board.Id, new CreateProjectCardRequest(
            board.Columns[0].Id,
            "Card 1",
            MilestoneId: milestone.Value!.Id,
            LabelId: label.Value!.Id));

        await service.DeleteMilestoneAsync(userId, board.Id, milestone.Value.Id);
        await service.DeleteLabelAsync(userId, board.Id, label.Value.Id);
        var boardDetail = await service.GetBoardAsync(userId, board.Id);
        var refreshedCard = boardDetail.Value!.Columns[0].Cards[0];

        Assert.False(duplicateMilestone.IsSuccess);
        Assert.Equal("PROJECT_MILESTONE_DUPLICATE", Assert.IsType<ProjectError>(duplicateMilestone.Error).Code);
        Assert.False(duplicateLabel.IsSuccess);
        Assert.Equal("PROJECT_LABEL_DUPLICATE", Assert.IsType<ProjectError>(duplicateLabel.Error).Code);
        Assert.False(invalidCrossBoard.IsSuccess);
        Assert.True(created.IsSuccess);
        Assert.Null(refreshedCard.MilestoneId);
        Assert.Null(refreshedCard.LabelId);
        Assert.Empty(boardDetail.Value.Milestones!);
        Assert.Empty(boardDetail.Value.Labels!);
    }

    [Fact]
    public async Task ChecklistItems_Crud_RespectsOwnershipAndToggles()
    {
        var repository = new FakeProjectRepository();
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var board = SeedBoard(repository, ownerId);
        var service = new ProjectService(repository);
        var card = await service.CreateCardAsync(ownerId, board.Id, new CreateProjectCardRequest(board.Columns[0].Id, "Task"));

        var foreignAdd = await service.CreateChecklistItemAsync(foreignId, card.Value!.Id, new CreateProjectChecklistItemRequest("Nope"));
        var added = await service.CreateChecklistItemAsync(ownerId, card.Value.Id, new CreateProjectChecklistItemRequest("Write migration"));
        var toggled = await service.UpdateChecklistItemAsync(ownerId, card.Value.Id, added.Value!.Id, new UpdateProjectChecklistItemRequest(IsCompleted: true));
        var deleted = await service.DeleteChecklistItemAsync(ownerId, card.Value.Id, added.Value.Id);
        var boardDetail = await service.GetBoardAsync(ownerId, board.Id);

        Assert.False(foreignAdd.IsSuccess);
        Assert.True(toggled.Value!.IsCompleted);
        Assert.True(deleted.Value);
        Assert.Empty(boardDetail.Value!.Columns[0].Cards[0].ChecklistItems!);
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
        public List<ProjectMilestone> Milestones { get; } = [];
        public List<ProjectLabel> Labels { get; } = [];
        public List<ProjectCardChecklistItem> ChecklistItems { get; } = [];

        public Task<IReadOnlyList<ProjectBoardSummaryDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            IReadOnlyList<ProjectBoardSummaryDto> boards = Boards.Where(board => board.UserId == userId && board.DeletedAt is null)
                .OrderBy(board => board.CreatedAt)
                .Select(board => new ProjectBoardSummaryDto(board.Id, board.Name,
                    board.Columns.Count(column => column.DeletedAt is null),
                    board.Columns.Where(column => column.DeletedAt is null).SelectMany(column => column.Cards).Count(card => card.DeletedAt is null),
                    board.CreatedAt, board.UpdatedAt)).ToList();
            return Task.FromResult(boards);
        }

        public Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
        {
            var board = Boards.FirstOrDefault(b => b.UserId == userId && b.Id == boardId && b.DeletedAt is null);
            return Task.FromResult(board is null ? null : HydrateBoard(board));
        }

        public Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(col => col.Id == columnId && col.DeletedAt is null);
            if (column is not null)
            {
                foreach (var card in column.Cards) HydrateCard(card);
            }
            return Task.FromResult(column);
        }

        public Task<ProjectCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
        {
            var card = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .Where(column => column.DeletedAt is null)
                .SelectMany(column => column.Cards)
                .FirstOrDefault(c => c.Id == cardId && c.DeletedAt is null);
            return Task.FromResult(card is null ? null : HydrateCard(card));
        }

        public Task<Guid?> GetBoardIdForCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
        {
            var boardId = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns.Where(col => col.DeletedAt is null).Select(col => new { board.Id, col.Cards }))
                .Where(x => x.Cards.Any(c => c.Id == cardId && c.DeletedAt is null))
                .Select(x => (Guid?)x.Id)
                .FirstOrDefault();
            return Task.FromResult(boardId);
        }

        public Task<ProjectColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var column = Boards
                .Where(board => board.UserId == userId && board.DeletedAt is null)
                .SelectMany(board => board.Columns)
                .FirstOrDefault(col => col.Id == columnId && col.DeletedAt is null);
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

        public Task AddBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
        {
            Boards.Add(board);
            return Task.CompletedTask;
        }

        public Task AddColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
        {
            var board = Boards.First(b => b.Id == column.BoardId);
            board.AddColumn(column.Name, column.SortOrder);
            return Task.CompletedTask;
        }

        public Task AddCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
        {
            var column = Boards.SelectMany(b => b.Columns).First(c => c.Id == card.ColumnId);
            var listField = typeof(ProjectColumn).GetField("_cards", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var list = (List<ProjectCard>)listField.GetValue(column)!;
            list.Add(card);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<ProjectMilestone?> GetMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, CancellationToken cancellationToken = default)
        {
            var ownsBoard = Boards.Any(b => b.Id == boardId && b.UserId == userId && b.DeletedAt is null);
            if (!ownsBoard) return Task.FromResult<ProjectMilestone?>(null);
            return Task.FromResult(Milestones.FirstOrDefault(m => m.BoardId == boardId && m.Id == milestoneId && m.DeletedAt is null));
        }

        public Task<bool> MilestoneNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeMilestoneId = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Milestones.Any(m => m.BoardId == boardId
                && m.DeletedAt is null
                && m.NormalizedName == normalizedName
                && (!excludeMilestoneId.HasValue || m.Id != excludeMilestoneId.Value)));
        }

        public Task<int> NextMilestoneSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
        {
            var next = Milestones.Where(m => m.BoardId == boardId && m.DeletedAt is null).Select(m => m.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            return Task.FromResult(next);
        }

        public Task AddMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default)
        {
            Milestones.Add(milestone);
            return Task.CompletedTask;
        }

        public Task UpdateMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<bool> SoftDeleteMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var board = Boards.FirstOrDefault(b => b.Id == boardId && b.UserId == userId && b.DeletedAt is null);
            var milestone = Milestones.FirstOrDefault(m => m.BoardId == boardId && m.Id == milestoneId && m.DeletedAt is null);
            if (board is null || milestone is null) return Task.FromResult(false);
            milestone.SoftDelete(nowUtc);
            foreach (var card in board.Columns.SelectMany(c => c.Cards).Where(c => c.MilestoneId == milestoneId && c.DeletedAt is null))
            {
                card.SetMilestone(null);
            }
            return Task.FromResult(true);
        }

        public Task<ProjectLabel?> GetLabelAsync(Guid userId, Guid boardId, Guid labelId, CancellationToken cancellationToken = default)
        {
            var ownsBoard = Boards.Any(b => b.Id == boardId && b.UserId == userId && b.DeletedAt is null);
            if (!ownsBoard) return Task.FromResult<ProjectLabel?>(null);
            return Task.FromResult(Labels.FirstOrDefault(l => l.BoardId == boardId && l.Id == labelId && l.DeletedAt is null));
        }

        public Task<bool> LabelNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeLabelId = null, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(Labels.Any(l => l.BoardId == boardId
                && l.DeletedAt is null
                && l.NormalizedName == normalizedName
                && (!excludeLabelId.HasValue || l.Id != excludeLabelId.Value)));
        }

        public Task AddLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default)
        {
            Labels.Add(label);
            return Task.CompletedTask;
        }

        public Task UpdateLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<bool> SoftDeleteLabelAsync(Guid userId, Guid boardId, Guid labelId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var board = Boards.FirstOrDefault(b => b.Id == boardId && b.UserId == userId && b.DeletedAt is null);
            var label = Labels.FirstOrDefault(l => l.BoardId == boardId && l.Id == labelId && l.DeletedAt is null);
            if (board is null || label is null) return Task.FromResult(false);
            label.SoftDelete(nowUtc);
            foreach (var card in board.Columns.SelectMany(c => c.Cards).Where(c => c.LabelId == labelId && c.DeletedAt is null))
            {
                card.SetLabel(null);
            }
            return Task.FromResult(true);
        }

        public Task<ProjectCardChecklistItem?> GetChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, CancellationToken cancellationToken = default)
        {
            var ownsCard = Boards.Where(b => b.UserId == userId && b.DeletedAt is null)
                .SelectMany(b => b.Columns).Where(c => c.DeletedAt is null)
                .SelectMany(c => c.Cards).Any(c => c.Id == cardId && c.DeletedAt is null);
            if (!ownsCard) return Task.FromResult<ProjectCardChecklistItem?>(null);
            return Task.FromResult(ChecklistItems.FirstOrDefault(i => i.CardId == cardId && i.Id == itemId && i.DeletedAt is null));
        }

        public Task<int> NextChecklistSortOrderAsync(Guid cardId, CancellationToken cancellationToken = default)
        {
            var next = ChecklistItems.Where(i => i.CardId == cardId && i.DeletedAt is null).Select(i => i.SortOrder).DefaultIfEmpty(-1).Max() + 1;
            return Task.FromResult(next);
        }

        public Task AddChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default)
        {
            ChecklistItems.Add(item);
            return Task.CompletedTask;
        }

        public Task AddChecklistItemsAsync(IReadOnlyList<ProjectCardChecklistItem> items, CancellationToken cancellationToken = default)
        {
            ChecklistItems.AddRange(items);
            return Task.CompletedTask;
        }

        public Task UpdateChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task<bool> SoftDeleteChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, DateTime nowUtc, CancellationToken cancellationToken = default)
        {
            var ownsCard = Boards.Where(b => b.UserId == userId && b.DeletedAt is null)
                .SelectMany(b => b.Columns).Where(c => c.DeletedAt is null)
                .SelectMany(c => c.Cards).Any(c => c.Id == cardId && c.DeletedAt is null);
            var item = ChecklistItems.FirstOrDefault(i => i.CardId == cardId && i.Id == itemId && i.DeletedAt is null);
            if (!ownsCard || item is null) return Task.FromResult(false);
            item.SoftDelete(nowUtc);
            return Task.FromResult(true);
        }

        private ProjectBoard HydrateBoard(ProjectBoard board)
        {
            var milestonesField = typeof(ProjectBoard).GetField("_milestones", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var milestonesList = (List<ProjectMilestone>)milestonesField.GetValue(board)!;
            milestonesList.Clear();
            milestonesList.AddRange(Milestones.Where(m => m.BoardId == board.Id && m.DeletedAt is null));

            var labelsField = typeof(ProjectBoard).GetField("_labels", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var labelsList = (List<ProjectLabel>)labelsField.GetValue(board)!;
            labelsList.Clear();
            labelsList.AddRange(Labels.Where(l => l.BoardId == board.Id && l.DeletedAt is null));

            foreach (var card in board.Columns.SelectMany(c => c.Cards))
            {
                HydrateCard(card);
            }

            return board;
        }

        private ProjectCard HydrateCard(ProjectCard card)
        {
            var milestone = card.MilestoneId.HasValue
                ? Milestones.FirstOrDefault(m => m.Id == card.MilestoneId && m.DeletedAt is null)
                : null;
            typeof(ProjectCard).GetProperty(nameof(ProjectCard.Milestone))!.SetValue(card, milestone);

            var label = card.LabelId.HasValue
                ? Labels.FirstOrDefault(l => l.Id == card.LabelId && l.DeletedAt is null)
                : null;
            typeof(ProjectCard).GetProperty(nameof(ProjectCard.Label))!.SetValue(card, label);

            var checklistField = typeof(ProjectCard).GetField("_checklistItems", System.Reflection.BindingFlags.Instance | System.Reflection.BindingFlags.NonPublic)!;
            var checklistList = (List<ProjectCardChecklistItem>)checklistField.GetValue(card)!;
            checklistList.Clear();
            checklistList.AddRange(ChecklistItems.Where(i => i.CardId == card.Id && i.DeletedAt is null));

            return card;
        }
    }
}
