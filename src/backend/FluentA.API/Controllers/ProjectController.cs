using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/project")]
public sealed class ProjectController : ApiControllerBase
{
    private readonly IProjectService _project;

    public ProjectController(IProjectService project)
    {
        _project = project;
    }

    /// <summary>Lists Project board summaries for the authenticated user.</summary>
    [HttpGet("boards")]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var result = await _project.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<IReadOnlyList<ProjectBoardSummaryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a Project board with default columns.</summary>
    [HttpPost("boards")]
    public async Task<IActionResult> CreateBoard(CreateProjectBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets one owned Project board with all active columns, cards, milestones, and labels.</summary>
    [HttpGet("boards/{boardId:guid}")]
    public async Task<IActionResult> GetBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _project.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project board.</summary>
    [HttpPatch("boards/{boardId:guid}")]
    public async Task<IActionResult> UpdateBoard(Guid boardId, UpdateProjectBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateBoardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned Project board.</summary>
    [HttpDelete("boards/{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }

    /// <summary>Adds a column to an owned Project board.</summary>
    [HttpPost("boards/{boardId:guid}/columns")]
    public async Task<IActionResult> CreateColumn(Guid boardId, CreateProjectColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateColumnAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project column.</summary>
    [HttpPatch("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid boardId, Guid columnId, UpdateProjectColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateColumnAsync(CurrentUserId(), boardId, columnId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an empty owned Project column.</summary>
    [HttpDelete("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid boardId, Guid columnId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteColumnAsync(CurrentUserId(), boardId, columnId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }

    /// <summary>Creates a milestone on an owned Project board.</summary>
    [HttpPost("boards/{boardId:guid}/milestones")]
    public async Task<IActionResult> CreateMilestone(Guid boardId, CreateProjectMilestoneRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateMilestoneAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectMilestoneDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a milestone on an owned Project board.</summary>
    [HttpPatch("boards/{boardId:guid}/milestones/{milestoneId:guid}")]
    public async Task<IActionResult> UpdateMilestone(Guid boardId, Guid milestoneId, UpdateProjectMilestoneRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateMilestoneAsync(CurrentUserId(), boardId, milestoneId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectMilestoneDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a milestone from an owned Project board.</summary>
    [HttpDelete("boards/{boardId:guid}/milestones/{milestoneId:guid}")]
    public async Task<IActionResult> DeleteMilestone(Guid boardId, Guid milestoneId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteMilestoneAsync(CurrentUserId(), boardId, milestoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }

    /// <summary>Creates a label on an owned Project board.</summary>
    [HttpPost("boards/{boardId:guid}/labels")]
    public async Task<IActionResult> CreateLabel(Guid boardId, CreateProjectLabelRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateLabelAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectLabelDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a label on an owned Project board.</summary>
    [HttpPatch("boards/{boardId:guid}/labels/{labelId:guid}")]
    public async Task<IActionResult> UpdateLabel(Guid boardId, Guid labelId, UpdateProjectLabelRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateLabelAsync(CurrentUserId(), boardId, labelId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectLabelDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a label from an owned Project board.</summary>
    [HttpDelete("boards/{boardId:guid}/labels/{labelId:guid}")]
    public async Task<IActionResult> DeleteLabel(Guid boardId, Guid labelId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteLabelAsync(CurrentUserId(), boardId, labelId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }

    /// <summary>Creates a card in an owned Project column.</summary>
    [HttpPost("boards/{boardId:guid}/cards")]
    public async Task<IActionResult> CreateCard(Guid boardId, CreateProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateCardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project card.</summary>
    [HttpPatch("cards/{cardId:guid}")]
    public async Task<IActionResult> UpdateCard(Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned Project card to another owned column and sort position.</summary>
    [HttpPatch("cards/{cardId:guid}/move")]
    public async Task<IActionResult> MoveCard(Guid cardId, MoveProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.MoveCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned Project card.</summary>
    [HttpDelete("cards/{cardId:guid}")]
    public async Task<IActionResult> DeleteCard(Guid cardId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteCardAsync(CurrentUserId(), cardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }

    /// <summary>Adds a checklist item to an owned Project card.</summary>
    [HttpPost("cards/{cardId:guid}/checklist")]
    public async Task<IActionResult> CreateChecklistItem(Guid cardId, CreateProjectChecklistItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateChecklistItemAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<ProjectCardChecklistItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a checklist item on an owned Project card.</summary>
    [HttpPatch("cards/{cardId:guid}/checklist/{itemId:guid}")]
    public async Task<IActionResult> UpdateChecklistItem(Guid cardId, Guid itemId, UpdateProjectChecklistItemRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateChecklistItemAsync(CurrentUserId(), cardId, itemId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<ProjectCardChecklistItemDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes a checklist item from an owned Project card.</summary>
    [HttpDelete("cards/{cardId:guid}/checklist/{itemId:guid}")]
    public async Task<IActionResult> DeleteChecklistItem(Guid cardId, Guid itemId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteChecklistItemAsync(CurrentUserId(), cardId, itemId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = result.Value }))
            : ToErrorResult(result);
    }
}
