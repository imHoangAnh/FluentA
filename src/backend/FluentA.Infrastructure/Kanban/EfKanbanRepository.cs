using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Domain.BoundedContexts.Kanban.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Kanban;

public sealed class EfKanbanRepository : IKanbanRepository
{
    private readonly AppDbContext _dbContext;

    public EfKanbanRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<KanbanBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.KanbanBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderBy(board => board.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<KanbanBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.KanbanBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public Task<KanbanColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return _dbContext.KanbanColumns
            .Include(column => column.Cards)
            .Where(column => column.Id == columnId && column.BoardId == boardId && column.DeletedAt == null)
            .Join(
                _dbContext.KanbanBoards.Where(board => board.UserId == userId && board.DeletedAt == null),
                column => column.BoardId,
                board => board.Id,
                (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KanbanCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default)
    {
        return (
            from card in _dbContext.KanbanCards
            join column in _dbContext.KanbanColumns on card.ColumnId equals column.Id
            join board in _dbContext.KanbanBoards on column.BoardId equals board.Id
            where card.Id == cardId
                && card.DeletedAt == null
                && column.DeletedAt == null
                && board.DeletedAt == null
                && board.UserId == userId
            select card)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KanbanColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default)
    {
        return _dbContext.KanbanColumns
            .Where(column => column.Id == columnId && column.DeletedAt == null)
            .Join(
                _dbContext.KanbanBoards.Where(board => board.UserId == userId && board.DeletedAt == null),
                column => column.BoardId,
                board => board.Id,
                (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KanbanBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return _dbContext.KanbanBoards
            .Include(board => board.Columns)
            .ThenInclude(column => column.Cards)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == trashedAt, cancellationToken);
    }

    public Task<KanbanColumn?> GetTrashedColumnAsync(Guid userId, Guid columnId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return _dbContext.KanbanColumns
            .Include(column => column.Cards)
            .Where(column => column.Id == columnId && column.DeletedAt == trashedAt)
            .Join(_dbContext.KanbanBoards.Where(board => board.UserId == userId && board.DeletedAt == null), column => column.BoardId, board => board.Id, (column, _) => column)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public Task<KanbanCard?> GetTrashedCardAsync(Guid userId, Guid cardId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return (from card in _dbContext.KanbanCards
                join column in _dbContext.KanbanColumns on card.ColumnId equals column.Id
                join board in _dbContext.KanbanBoards on column.BoardId equals board.Id
                where card.Id == cardId && card.DeletedAt == trashedAt && column.DeletedAt == null && board.DeletedAt == null && board.UserId == userId
                select card).FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.KanbanColumns
            .Where(column => column.BoardId == boardId && column.DeletedAt == null)
            .Select(column => (int?)column.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.KanbanCards
            .Where(card => card.ColumnId == columnId && card.DeletedAt == null)
            .Select(card => (int?)card.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task AddBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default)
    {
        await _dbContext.KanbanBoards.AddAsync(board, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default)
    {
        await _dbContext.KanbanColumns.AddAsync(column, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddCardAsync(KanbanCard card, CancellationToken cancellationToken = default)
    {
        await _dbContext.KanbanCards.AddAsync(card, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanBoards.Update(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanColumns.Update(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateCardAsync(KanbanCard card, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanCards.Update(card);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanCards.RemoveRange(board.Columns.SelectMany(column => column.Cards));
        _dbContext.KanbanColumns.RemoveRange(board.Columns);
        _dbContext.KanbanBoards.Remove(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanCards.RemoveRange(column.Cards);
        _dbContext.KanbanColumns.Remove(column);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveCardAsync(KanbanCard card, CancellationToken cancellationToken = default)
    {
        _dbContext.KanbanCards.Remove(card);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
