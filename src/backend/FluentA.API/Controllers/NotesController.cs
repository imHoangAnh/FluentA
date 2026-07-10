using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notes")]
public sealed class NotesController : ControllerBase
{
    private readonly INoteService _notes;

    public NotesController(INoteService notes)
    {
        _notes = notes;
    }

    [HttpGet("boards")]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var result = await _notes.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<NoteBoardSummaryDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("boards")]
    public async Task<IActionResult> CreateBoard(CreateNoteBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _notes.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<NoteBoardSummaryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("boards/{boardId:guid}")]
    public async Task<IActionResult> UpdateBoard(Guid boardId, UpdateNoteBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _notes.UpdateBoardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NoteBoardSummaryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpDelete("boards/{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _notes.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Note board deleted." }))
            : ToErrorResult(result);
    }

    [HttpPost("boards/{boardId:guid}/pages")]
    public async Task<IActionResult> CreatePage(Guid boardId, CreateNotePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _notes.CreatePageAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<NotePageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("pages/{pageId:guid}")]
    public async Task<IActionResult> GetPage(Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _notes.GetPageAsync(CurrentUserId(), pageId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NotePageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("pages/{pageId:guid}")]
    public async Task<IActionResult> UpdatePage(Guid pageId, UpdateNotePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _notes.UpdatePageAsync(CurrentUserId(), pageId, request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<NotePageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpDelete("pages/{pageId:guid}")]
    public async Task<IActionResult> DeletePage(Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _notes.DeletePageAsync(CurrentUserId(), pageId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Note page deleted." }))
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
        if (result.Error is not NoteError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
