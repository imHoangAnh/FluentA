using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Project;

public interface IProjectService
{
    /// <summary>Lists Project board summaries for a user.</summary>
    Task<OperationResult<IReadOnlyList<ProjectBoardSummaryDto>>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Creates a Project board with default columns.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> CreateBoardAsync(Guid userId, CreateProjectBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Gets one Project board with active columns, cards, milestones, and labels.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project board.</summary>
    Task<OperationResult<ProjectBoardDetailDto>> UpdateBoardAsync(Guid userId, Guid boardId, UpdateProjectBoardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes an owned Project board and its children.</summary>
    Task<OperationResult<bool>> DeleteBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default);
    /// <summary>Adds a column to an owned Project board.</summary>
    Task<OperationResult<ProjectColumnDto>> CreateColumnAsync(Guid userId, Guid boardId, CreateProjectColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project column.</summary>
    Task<OperationResult<ProjectColumnDto>> UpdateColumnAsync(Guid userId, Guid boardId, Guid columnId, UpdateProjectColumnRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes an empty owned Project column.</summary>
    Task<OperationResult<bool>> DeleteColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default);
    /// <summary>Creates a card in an owned Project column.</summary>
    Task<OperationResult<ProjectCardDto>> CreateCardAsync(Guid userId, Guid boardId, CreateProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Updates an owned Project card.</summary>
    Task<OperationResult<ProjectCardDto>> UpdateCardAsync(Guid userId, Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Moves an owned Project card to another owned column.</summary>
    Task<OperationResult<ProjectCardDto>> MoveCardAsync(Guid userId, Guid cardId, MoveProjectCardRequest request, CancellationToken cancellationToken = default);
    /// <summary>Soft-deletes an owned Project card.</summary>
    Task<OperationResult<bool>> DeleteCardAsync(Guid userId, Guid cardId, CancellationToken cancellationToken = default);

    Task<OperationResult<ProjectMilestoneDto>> CreateMilestoneAsync(Guid userId, Guid boardId, CreateProjectMilestoneRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<ProjectMilestoneDto>> UpdateMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, UpdateProjectMilestoneRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteMilestoneAsync(Guid userId, Guid boardId, Guid milestoneId, CancellationToken cancellationToken = default);

    Task<OperationResult<ProjectLabelDto>> CreateLabelAsync(Guid userId, Guid boardId, CreateProjectLabelRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<ProjectLabelDto>> UpdateLabelAsync(Guid userId, Guid boardId, Guid labelId, UpdateProjectLabelRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteLabelAsync(Guid userId, Guid boardId, Guid labelId, CancellationToken cancellationToken = default);

    Task<OperationResult<ProjectCardChecklistItemDto>> CreateChecklistItemAsync(Guid userId, Guid cardId, CreateProjectChecklistItemRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<ProjectCardChecklistItemDto>> UpdateChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, UpdateProjectChecklistItemRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteChecklistItemAsync(Guid userId, Guid cardId, Guid itemId, CancellationToken cancellationToken = default);
}
