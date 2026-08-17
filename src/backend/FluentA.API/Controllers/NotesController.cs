using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Note.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/notes")]
public sealed class NotesController : ApiControllerBase
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
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
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
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

}
