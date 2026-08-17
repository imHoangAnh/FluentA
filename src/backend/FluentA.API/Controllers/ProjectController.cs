using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Project.DTOs;
using FluentA.Application.BoundedContexts.Trash;
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
            ? Ok(ApiEnvelope<IReadOnlyList<ProjectBoardSummaryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a Project board with default columns.</summary>
    [HttpPost("boards")]
    public async Task<IActionResult> CreateBoard(CreateProjectBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets one owned Project board with all active columns and cards.</summary>
    [HttpGet("boards/{boardId:guid}")]
    public async Task<IActionResult> GetBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _project.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project board.</summary>
    [HttpPatch("boards/{boardId:guid}")]
    public async Task<IActionResult> UpdateBoard(Guid boardId, UpdateProjectBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateBoardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ProjectBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned Project board to Trash.</summary>
    [HttpDelete("boards/{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Adds a column to an owned Project board.</summary>
    [HttpPost("boards/{boardId:guid}/columns")]
    public async Task<IActionResult> CreateColumn(Guid boardId, CreateProjectColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateColumnAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<ProjectColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project column.</summary>
    [HttpPatch("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid boardId, Guid columnId, UpdateProjectColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateColumnAsync(CurrentUserId(), boardId, columnId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ProjectColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an empty owned Project column to Trash.</summary>
    [HttpDelete("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid boardId, Guid columnId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteColumnAsync(CurrentUserId(), boardId, columnId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a card in an owned Project column.</summary>
    [HttpPost("boards/{boardId:guid}/cards")]
    public async Task<IActionResult> CreateCard(Guid boardId, CreateProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.CreateCardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Project card.</summary>
    [HttpPatch("cards/{cardId:guid}")]
    public async Task<IActionResult> UpdateCard(Guid cardId, UpdateProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.UpdateCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned Project card to another owned column and sort position.</summary>
    [HttpPatch("cards/{cardId:guid}/move")]
    public async Task<IActionResult> MoveCard(Guid cardId, MoveProjectCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _project.MoveCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ProjectCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned Project card to Trash.</summary>
    [HttpDelete("cards/{cardId:guid}")]
    public async Task<IActionResult> DeleteCard(Guid cardId, CancellationToken cancellationToken)
    {
        var result = await _project.DeleteCardAsync(CurrentUserId(), cardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

}
