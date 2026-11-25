using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Project;

public sealed class EfProjectRepository : IProjectRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectBoardSummaryDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ProjectBoards
            .AsNoTracking()
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderBy(board => board.CreatedAt)
            .Select(board => new ProjectBoardSummaryDto(
                board.Id, board.Name,
                board.Columns.Count(column => column.DeletedAt == null),
                board.Columns.Where(column => column.DeletedAt == null)
                    .SelectMany(column => column.Cards).Count(card => card.DeletedAt == null),
                board.CreatedAt, board.UpdatedAt))
            .ToListAsync(cancellationToken);
    }

    public Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectBoards
            .Include(board => board.Milestones.Where(milestone => milestone.DeletedAt == null))
            .Include(board => board.Labels.Where(label => label.DeletedAt == null))
            .Include(board => board.Columns)
                .ThenInclude(column => column.Cards)
                    .ThenInclude(card => card.Milestone)
            .Include(board => board.Columns)
                .ThenInclude(column => column.Cards)
                    .ThenInclude(card => card.Label)
            .Include(board => board.Columns)
                .ThenInclude(column => column.Cards)
                    .ThenInclude(card => card.ChecklistItems.Where(item => item.DeletedAt == null))
            .AsSplitQuery()
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectColumns
            .Include(column => column.Cards)
                .ThenInclude(card => card.Milestone)
            .Include(column => column.Cards)
                .ThenInclude(card => card.Label)
            .Include(column => column.Cards)
                .ThenInclude(card => card.ChecklistItems.Where(item => item.DeletedAt == null))
            .AsSplitQuery()
            .Where(column => column.Id == columnId && column.BoardId == boardId && column.DeletedAt == null)
            .Join(
                _dbContext.ProjectBoards.Where(board => board.UserId == userId && board.DeletedAt == null),
                column => column.BoardId,
                board => board.Id,
                (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ProjectCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        return (
            from card in _dbContext.ProjectCards
                .Include(item => item.Milestone)
                .Include(item => item.Label)
                .Include(item => item.ChecklistItems.Where(check => check.DeletedAt == null))
                .AsSplitQuery()
            join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
            join board in _dbContext.ProjectBoards on column.BoardId equals board.Id
            where card.Id == cardId
                && card.DeletedAt == null
                && column.DeletedAt == null
                && board.DeletedAt == null
                && board.UserId == userId
            select card)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<Guid?> GetBoardIdForCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        return await (
            from card in _dbContext.ProjectCards
            join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
            join board in _dbContext.ProjectBoards on column.BoardId equals board.Id
            where card.Id == cardId
                && card.DeletedAt == null
                && column.DeletedAt == null
                && board.DeletedAt == null
                && board.UserId == userId
            select (Guid?)board.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ProjectColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectColumns
            .Where(column => column.Id == columnId && column.DeletedAt == null)
            .Join(
                _dbContext.ProjectBoards.Where(board => board.UserId == userId && board.DeletedAt == null),
                column => column.BoardId,
                board => board.Id,
                (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.ProjectColumns
            .Where(column => column.BoardId == boardId && column.DeletedAt == null)
            .Select(column => (int?)column.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.ProjectCards
            .Where(card => card.ColumnId == columnId && card.DeletedAt == null)
            .Select(card => (int?)card.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task AddBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectBoards.AddAsync(board, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectColumns.AddAsync(column, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectCards.AddAsync(card, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(board).State == EntityState.Detached)
            _dbContext.ProjectBoards.Update(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(column).State == EntityState.Detached)
            _dbContext.ProjectColumns.Update(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(card).State == EntityState.Detached)
            _dbContext.ProjectCards.Update(card);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<ProjectMilestone?> GetMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectMilestones
            .Where(milestone => milestone.Id == milestoneId && milestone.BoardId == boardId && milestone.DeletedAt == null)
            .Join(
                _dbContext.ProjectBoards.Where(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null),
                milestone => milestone.BoardId,
                board => board.Id,
                (milestone, _) => milestone)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> MilestoneNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeMilestoneId = null, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectMilestones.AnyAsync(
            milestone => milestone.BoardId == boardId
                && milestone.DeletedAt == null
                && milestone.NormalizedName == normalizedName
                && (!excludeMilestoneId.HasValue || milestone.Id != excludeMilestoneId.Value),
            cancellationToken);
    }

    public async Task<int> NextMilestoneSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var maximum = await _dbContext.ProjectMilestones
            .Where(milestone => milestone.BoardId == boardId && milestone.DeletedAt == null)
            .Select(milestone => (int?)milestone.SortOrder)
            .MaxAsync(cancellationToken);
        return (maximum ?? -1) + 1;
    }

    public async Task AddMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectMilestones.AddAsync(milestone, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateMilestoneAsync(ProjectMilestone milestone, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(milestone).State == EntityState.Detached)
            _dbContext.ProjectMilestones.Update(milestone);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var milestone = await GetMilestoneAsync(userId, boardId, milestoneId, cancellationToken);
        if (milestone is null)
        {
            return false;
        }

        milestone.SoftDelete(nowUtc);
        var affectedCards = await (
            from card in _dbContext.ProjectCards
            join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
            where column.BoardId == boardId
                && card.MilestoneId == milestoneId
                && card.DeletedAt == null
                && column.DeletedAt == null
            select card)
            .ToListAsync(cancellationToken);
        foreach (var card in affectedCards)
        {
            card.SetMilestone(null);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<ProjectLabel?> GetLabelAsync(Guid userId, Guid boardId, Guid labelId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectLabels
            .Where(label => label.Id == labelId && label.BoardId == boardId && label.DeletedAt == null)
            .Join(
                _dbContext.ProjectBoards.Where(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null),
                label => label.BoardId,
                board => board.Id,
                (label, _) => label)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<bool> LabelNameExistsAsync(Guid boardId, string normalizedName, Guid? excludeLabelId = null, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectLabels.AnyAsync(
            label => label.BoardId == boardId
                && label.DeletedAt == null
                && label.NormalizedName == normalizedName
                && (!excludeLabelId.HasValue || label.Id != excludeLabelId.Value),
            cancellationToken);
    }

    public async Task AddLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectLabels.AddAsync(label, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateLabelAsync(ProjectLabel label, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(label).State == EntityState.Detached)
            _dbContext.ProjectLabels.Update(label);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteLabelAsync(Guid userId, Guid boardId, Guid labelId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var label = await GetLabelAsync(userId, boardId, labelId, cancellationToken);
        if (label is null)
        {
            return false;
        }

        label.SoftDelete(nowUtc);
        var affectedCards = await (
            from card in _dbContext.ProjectCards
            join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
            where column.BoardId == boardId
                && card.LabelId == labelId
                && card.DeletedAt == null
                && column.DeletedAt == null
            select card)
            .ToListAsync(cancellationToken);
        foreach (var card in affectedCards)
        {
            card.SetLabel(null);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public Task<ProjectCardChecklistItem?> GetChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, CancellationToken cancellationToken = default)
    {
        return (
            from item in _dbContext.ProjectCardChecklistItems
            join card in _dbContext.ProjectCards on item.CardId equals card.Id
            join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
            join board in _dbContext.ProjectBoards on column.BoardId equals board.Id
            where item.Id == itemId
                && item.CardId == cardId
                && item.DeletedAt == null
                && card.DeletedAt == null
                && column.DeletedAt == null
                && board.DeletedAt == null
                && board.UserId == userId
            select item)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> NextChecklistSortOrderAsync(Guid cardId, CancellationToken cancellationToken = default)
    {
        var maximum = await _dbContext.ProjectCardChecklistItems
            .Where(item => item.CardId == cardId && item.DeletedAt == null)
            .Select(item => (int?)item.SortOrder)
            .MaxAsync(cancellationToken);
        return (maximum ?? -1) + 1;
    }

    public async Task AddChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default)
    {
        await _dbContext.ProjectCardChecklistItems.AddAsync(item, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddChecklistItemsAsync(IReadOnlyList<ProjectCardChecklistItem> items, CancellationToken cancellationToken = default)
    {
        if (items.Count == 0)
        {
            return;
        }

        await _dbContext.ProjectCardChecklistItems.AddRangeAsync(items, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateChecklistItemAsync(ProjectCardChecklistItem item, CancellationToken cancellationToken = default)
    {
        if (_dbContext.Entry(item).State == EntityState.Detached)
            _dbContext.ProjectCardChecklistItems.Update(item);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> SoftDeleteChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        var item = await GetChecklistItemAsync(userId, cardId, itemId, cancellationToken);
        if (item is null)
        {
            return false;
        }

        item.SoftDelete(nowUtc);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}
