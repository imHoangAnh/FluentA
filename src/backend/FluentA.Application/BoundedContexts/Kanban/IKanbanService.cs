using FluentA.Application.BoundedContexts.Kanban.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Kanban;

public interface IKanbanService
{
    /// <summary>Lists Kanban board summaries for a user.</summary>
    Task<OperationResult<IReadOnlyList<KanbanBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Creates a Kanban board with default columns.</summary>
    Task<OperationResult<KanbanBoardDetailDto>> CreateBoardAsync(Guid userId, CreateKanbanBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Gets one Kanban board with active columns and cards.</summary>
    Task<OperationResult<KanbanBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Kanban board.</summary>
    Task<OperationResult<KanbanBoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateKanbanBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Kanban board to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Adds a column to an owned Kanban board.</summary>
    Task<OperationResult<KanbanColumnDto>> CreateColumnAsync(Guid userId, Guid boardId, CreateKanbanColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Kanban column.</summary>
    Task<OperationResult<KanbanColumnDto>> UpdateColumnAsync(Guid userId, Guid boardId, Guid columnId, UpdateKanbanColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an empty owned Kanban column to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    /// <summary>Creates a card in an owned Kanban column.</summary>
    Task<OperationResult<KanbanCardDto>> CreateCardAsync(Guid userId, Guid boardId, CreateKanbanCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Kanban card.</summary>
    Task<OperationResult<KanbanCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateKanbanCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Kanban card to another owned column.</summary>
    Task<OperationResult<KanbanCardDto>> MoveCardAsync(Guid userId, Guid cardId, MoveKanbanCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Kanban card to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
}
