using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/boards")]
public sealed class BoardsController : ControllerBase
{
    private readonly IVocabularyService _vocabulary;

    public BoardsController(IVocabularyService vocabulary)
    {
        _vocabulary = vocabulary;
    }

    /// <summary>Lists vocabulary boards owned by the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var result = await _vocabulary.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<BoardSummaryDto>>.Ok(result.Value!));
    }

    /// <summary>Creates a vocabulary board; synchronized page decks are created as pages are added.</summary>
    [HttpPost]
    public async Task<IActionResult> CreateBoard(CreateBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<BoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns one vocabulary board with its pages.</summary>
    [HttpGet("{boardId:guid}")]
    public async Task<IActionResult> GetBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BoardDetailDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Updates board metadata such as name and language.</summary>
    [HttpPatch("{boardId:guid}")]
    public async Task<IActionResult> UpdateBoard(Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateBoardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BoardDetailDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Soft-deletes a vocabulary board.</summary>
    [HttpDelete("{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Board deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Lists pages inside a vocabulary board.</summary>
    [HttpGet("{boardId:guid}/pages")]
    public async Task<IActionResult> ListPages(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.ListPagesAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<IReadOnlyList<PageDto>>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Creates a page and its synchronized Page Deck.</summary>
    [HttpPost("{boardId:guid}/pages")]
    public async Task<IActionResult> CreatePage(Guid boardId, CreatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreatePageAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<PageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates page metadata such as the page name.</summary>
    [HttpPatch("{boardId:guid}/pages/{pageId:guid}")]
    public async Task<IActionResult> UpdatePage(Guid boardId, Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdatePageAsync(CurrentUserId(), boardId, pageId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<PageDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Soft-deletes a page.</summary>
    [HttpDelete("{boardId:guid}/pages/{pageId:guid}")]
    public async Task<IActionResult> DeletePage(Guid boardId, Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeletePageAsync(CurrentUserId(), boardId, pageId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Page deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Lists vocabulary words for a page.</summary>
    [HttpGet("{boardId:guid}/pages/{pageId:guid}/words")]
    public async Task<IActionResult> ListWords(Guid boardId, Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.ListWordsAsync(CurrentUserId(), boardId, pageId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<IReadOnlyList<WordDto>>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Creates a vocabulary word and synchronized flashcards.</summary>
    [HttpPost("{boardId:guid}/pages/{pageId:guid}/words")]
    public async Task<IActionResult> CreateWord(Guid boardId, Guid pageId, WordRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreateWordAsync(CurrentUserId(), boardId, pageId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<WordDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates a full vocabulary word.</summary>
    [HttpPatch("{boardId:guid}/words/{wordId:guid}")]
    public async Task<IActionResult> UpdateWord(Guid boardId, Guid wordId, WordRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateWordAsync(CurrentUserId(), boardId, wordId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<WordDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Updates one spreadsheet cell for a vocabulary word.</summary>
    [HttpPatch("{boardId:guid}/words/{wordId:guid}/cells")]
    public async Task<IActionResult> UpdateWordCell(Guid boardId, Guid wordId, UpdateWordCellRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateWordCellAsync(CurrentUserId(), boardId, wordId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<WordDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Soft-deletes a vocabulary word and synchronized cards.</summary>
    [HttpDelete("{boardId:guid}/words/{wordId:guid}")]
    public async Task<IActionResult> DeleteWord(Guid boardId, Guid wordId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeleteWordAsync(CurrentUserId(), boardId, wordId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Word deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Returns custom column definitions and user visibility preferences.</summary>
    [HttpGet("{boardId:guid}/columns")]
    public async Task<IActionResult> GetColumnConfiguration(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.GetColumnConfigurationAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<ColumnConfigurationDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    /// <summary>Creates a board-wide custom vocabulary column.</summary>
    [HttpPost("{boardId:guid}/columns")]
    public async Task<IActionResult> CreateCustomColumn(Guid boardId, CreateCustomColumnRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreateCustomColumnAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<CustomColumnDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Permanently deletes a custom column and its values.</summary>
    [HttpDelete("{boardId:guid}/columns/{columnId:guid}")]
    public async Task<IActionResult> DeleteCustomColumn(Guid boardId, Guid columnId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeleteCustomColumnAsync(CurrentUserId(), boardId, columnId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Custom column permanently deleted." }))
            : ToErrorResult(result);
    }

    /// <summary>Updates the authenticated user's hidden columns for a board.</summary>
    [HttpPut("{boardId:guid}/column-visibility")]
    public async Task<IActionResult> UpdateColumnVisibility(Guid boardId, UpdateColumnVisibilityRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateColumnVisibilityAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<ColumnConfigurationDto>.Ok(result.Value!)) : ToErrorResult(result);
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
        if (result.Error is not VocabularyError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        var envelope = ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details));
        return StatusCode(error.StatusCode, envelope);
    }
}
