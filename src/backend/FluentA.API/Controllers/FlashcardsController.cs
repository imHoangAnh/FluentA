using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/flashcards")]
public sealed class FlashcardsController : ControllerBase
{
    private readonly IFlashcardService _flashcards;

    public FlashcardsController(IFlashcardService flashcards)
    {
        _flashcards = flashcards;
    }

    /// <summary>Lists vocabulary boards and pages for the authenticated user.</summary>
    [HttpGet("pages")]
    public async Task<IActionResult> ListBoards(CancellationToken cancellationToken)
    {
        var boards = await _flashcards.ListBoardsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<FlashcardBoardDto>>.Ok(boards));
    }

    /// <summary>Returns live page words for a flashcard/practice session setup.</summary>
    [HttpGet("pages/{pageId:guid}/words")]
    public async Task<IActionResult> GetPageSession(Guid pageId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetPageSessionAsync(CurrentUserId(), pageId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PageSessionDto>.Ok(result.Value!))
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

    private IActionResult ToErrorResult<T>(FluentA.Application.Common.OperationResult<T> result)
    {
        var error = result.Error switch
        {
            FlashcardError flashcardError => new ApiErrorEnvelope(flashcardError.Code, flashcardError.Message, flashcardError.Details),
            _ => null,
        };

        var statusCode = result.Error switch
        {
            FlashcardError flashcardError => flashcardError.StatusCode,
            _ => 500,
        };

        if (error is null)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(statusCode, ApiEnvelope<object>.Fail(error));
    }
}
