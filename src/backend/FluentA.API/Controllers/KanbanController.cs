using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Kanban;
using FluentA.Application.BoundedContexts.Kanban.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/kanban")]
public sealed class KanbanController : ControllerBase
{
    private readonly IKanbanService _kanban;

    public KanbanController(IKanbanService kanban)
    {
        _kanban = kanban;
    }

    /// <summary>Lists Kanban board summaries for the authenticated user.</summary>
    [HttpGet("boards")]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var result = await _kanban.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<KanbanBoardSummaryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a Kanban board with default columns.</summary>
    [HttpPost("boards")]
    public async Task<IActionResult> CreateBoard(CreateKanbanBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<KanbanBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets one owned Kanban board with all active columns and cards.</summary>
    [HttpGet("boards/{boardId:guid}")]
    public async Task<IActionResult> GetBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _kanban.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<KanbanBoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned Kanban board.</summary>
    [HttpDelete("boards/{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _kanban.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Kanban board deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Adds a column to an owned Kanban board.</summary>
    [HttpPost("boards/{boardId:guid}/columns")]
    public async Task<IActionResult> CreateColumn(Guid boardId, CreateKanbanColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.CreateColumnAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<KanbanColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Kanban column.</summary>
    [HttpPatch("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> UpdateColumn(Guid boardId, Guid columnId, UpdateKanbanColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.UpdateColumnAsync(CurrentUserId(), boardId, columnId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<KanbanColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Deletes an empty owned Kanban column.</summary>
    [HttpDelete("boards/{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteColumn(Guid boardId, Guid columnId, CancellationToken cancellationToken)
    {
        var result = await _kanban.DeleteColumnAsync(CurrentUserId(), boardId, columnId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Kanban column deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Creates a card in an owned Kanban column.</summary>
    [HttpPost("boards/{boardId:guid}/cards")]
    public async Task<IActionResult> CreateCard(Guid boardId, CreateKanbanCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.CreateCardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<KanbanCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates an owned Kanban card.</summary>
    [HttpPatch("cards/{cardId:guid}")]
    public async Task<IActionResult> UpdateCard(Guid cardId, UpdateKanbanCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.UpdateCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<KanbanCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Moves an owned Kanban card to another owned column and sort position.</summary>
    [HttpPatch("cards/{cardId:guid}/move")]
    public async Task<IActionResult> MoveCard(Guid cardId, MoveKanbanCardRequest request, CancellationToken cancellationToken)
    {
        var result = await _kanban.MoveCardAsync(CurrentUserId(), cardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<KanbanCardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned Kanban card.</summary>
    [HttpDelete("cards/{cardId:guid}")]
    public async Task<IActionResult> DeleteCard(Guid cardId, CancellationToken cancellationToken)
    {
        var result = await _kanban.DeleteCardAsync(CurrentUserId(), cardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Kanban card deleted." }))
            : ToErrorResult(result);
    }

    private Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedAccessException("Missing authenticated user id.");
        }

        return id;
    }

    private IActionResult ToErrorResult<T>(OperationResult<T> result)
    {
        if (result.Error is not KanbanError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
