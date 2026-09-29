using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/vocabs")]
public sealed class VocabController : ApiControllerBase
{
    private readonly IVocabularyService _vocabulary;

    public VocabController(IVocabularyService vocabulary)
    {
        _vocabulary = vocabulary;
    }

    [HttpGet("boards")]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var result = await _vocabulary.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<BoardSummaryDto>>.Ok(result.Value!));
    }

    [HttpPost("boards")]
    public async Task<IActionResult> CreateBoard(CreateBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreateBoardAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<BoardDetailDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("boards/{boardId:guid}")]
    public async Task<IActionResult> GetBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BoardDetailDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPatch("boards/{boardId:guid}")]
    public async Task<IActionResult> UpdateBoard(Guid boardId, UpdateBoardRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateBoardAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BoardDetailDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpDelete("boards/{boardId:guid}")]
    public async Task<IActionResult> DeleteBoard(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeleteBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("boards/{boardId:guid}/pages")]
    public async Task<IActionResult> ListPages(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<PageDto>>.Ok(result.Value!.Pages))
            : ToErrorResult(result);
    }

    [HttpPost("boards/{boardId:guid}/pages")]
    public async Task<IActionResult> CreatePage(Guid boardId, CreatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreatePageAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<PageDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("pages/{pageId:guid}")]
    public async Task<IActionResult> UpdatePage(Guid pageId, UpdatePageRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdatePageAsync(CurrentUserId(), pageId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<PageDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpDelete("pages/{pageId:guid}")]
    public async Task<IActionResult> DeletePage(Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeletePageAsync(CurrentUserId(), pageId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("pages/{pageId:guid}/words")]
    public async Task<IActionResult> ListWords(Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.ListWordsAsync(CurrentUserId(), pageId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<IReadOnlyList<WordDto>>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("pages/{pageId:guid}/words")]
    public async Task<IActionResult> CreateWord(Guid pageId, WordRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.CreateWordAsync(CurrentUserId(), pageId, request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<WordDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPatch("words/{wordId:guid}")]
    public async Task<IActionResult> UpdateWord(Guid wordId, WordPatchRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateWordAsync(CurrentUserId(), wordId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<WordDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpDelete("words/{wordId:guid}")]
    public async Task<IActionResult> DeleteWord(Guid wordId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.DeleteWordAsync(CurrentUserId(), wordId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpGet("boards/{boardId:guid}/preferences")]
    public async Task<IActionResult> GetBoardPreferences(Guid boardId, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.GetBoardAsync(CurrentUserId(), boardId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<BoardPreferencesDto>.Ok(result.Value!.Preferences))
            : ToErrorResult(result);
    }

    [HttpPut("boards/{boardId:guid}/preferences")]
    public async Task<IActionResult> UpdateBoardPreferences(Guid boardId, UpdateBoardPreferencesRequest request, CancellationToken cancellationToken)
    {
        var result = await _vocabulary.UpdateBoardPreferencesAsync(CurrentUserId(), boardId, request, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<BoardPreferencesDto>.Ok(result.Value!)) : ToErrorResult(result);
    }

}
