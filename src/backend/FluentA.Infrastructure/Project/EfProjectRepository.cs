using FluentA.Application.BoundedContexts.Project;
using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Project;

public sealed class EfProjectRepository : IProjectRepository
{
    private readonly AppDbContext _dbContext;

    public EfProjectRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<ProjectBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.ProjectBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderBy(board => board.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<ProjectBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public Task<ProjectColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectColumns
            .Include(column => column.Cards)
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

    public Task<ProjectBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == trashedAt, cancellationToken);
    }

    public Task<ProjectColumn?> GetTrashedColumnAsync(Guid userId, Guid columnId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return _dbContext.ProjectColumns
            .Include(column => column.Cards)
            .Where(column => column.Id == columnId && column.DeletedAt == trashedAt)
            .Join(_dbContext.ProjectBoards.Where(board => board.UserId == userId && board.DeletedAt == null), column => column.BoardId, board => board.Id, (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<ProjectCard?> GetTrashedCardAsync(Guid userId, Guid cardId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return (from card in _dbContext.ProjectCards
                join column in _dbContext.ProjectColumns on card.ColumnId equals column.Id
                join board in _dbContext.ProjectBoards on column.BoardId equals board.Id
                where card.Id == cardId && card.DeletedAt == trashedAt && column.DeletedAt == null && board.DeletedAt == null && board.UserId == userId
                select card).FirstOrDefaultAsync(cancellationToken);
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
        _dbContext.ProjectBoards.Update(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
    {
        _dbContext.ProjectColumns.Update(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
    {
        _dbContext.ProjectCards.Update(card);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveBoardAsync(ProjectBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.ProjectCards.RemoveRange(board.Columns.SelectMany(column => column.Cards));
        _dbContext.ProjectColumns.RemoveRange(board.Columns);
        _dbContext.ProjectBoards.Remove(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveColumnAsync(ProjectColumn column, CancellationToken cancellationToken = default)
    {
        _dbContext.ProjectCards.RemoveRange(column.Cards);
        _dbContext.ProjectColumns.Remove(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveCardAsync(ProjectCard card, CancellationToken cancellationToken = default)
    {
        _dbContext.ProjectCards.Remove(card);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
