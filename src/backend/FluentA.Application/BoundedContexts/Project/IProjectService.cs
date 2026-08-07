using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Project;

public interface IProjectService
{
    /// <summary>Lists Project board summaries for a user.</summary>
    Task<OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Creates a Project board with default columns.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> CreateBoardAsync(Guid userId, CreateProjectBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Gets one Project board with active columns and cards.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project board.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateProjectBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Project board to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Adds a column to an owned Project board.</summary>
    Task<OperationResult<ProjectColumnDto>> CreateColumnAsync(Guid userId, Guid boardId, CreateProjectColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project column.</summary>
    Task<OperationResult<ProjectColumnDto>> UpdateColumnAsync(Guid userId, Guid boardId, Guid columnId, UpdateProjectColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an empty owned Project column to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    /// <summary>Creates a card in an owned Project column.</summary>
    Task<OperationResult<ProjectCardDto>> CreateCardAsync(Guid userId, Guid boardId, CreateProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project card.</summary>
    Task<OperationResult<ProjectCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Project card to another owned column.</summary>
    Task<OperationResult<ProjectCardDto>> MoveCardAsync(Guid userId, Guid cardId, MoveProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Project card to Trash.</summary>
    Task<OperationResult<TrashEntryDto>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);
}
