using FluentA.Domain.BoundedContexts.Kanban.Entities;

namespace FluentA.Application.BoundedContexts.Kanban;

public interface IKanbanRepository
{
    Task<IReadOnlyList<KanbanBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<KanbanBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    Task<KanbanColumn?> GetColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    Task<KanbanCard?> GetCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
    Task<KanbanColumn?> GetColumnForCardAsync(Guid userId, Guid columnId, CancellationToken cancellationToken = default);
    Task<int> NextColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default);
    Task<int> NextCardSortOrderAsync(Guid columnId, CancellationToken cancellationToken = default);
    Task AddBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default);
    Task AddColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default);
    Task AddCardAsync(KanbanCard card, CancellationToken cancellationToken = default);
    Task UpdateBoardAsync(KanbanBoard board, CancellationToken cancellationToken = default);
    Task UpdateColumnAsync(KanbanColumn column, CancellationToken cancellationToken = default);
    Task UpdateCardAsync(KanbanCard card, CancellationToken cancellationToken = default);
}
