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

    [HttpGet("decks")]
    public async Task<IActionResult> ListDecks(CancellationToken cancellationToken)
    {
        var decks = await _flashcards.ListDecksAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<FlashcardDeckDto>>.Ok(decks));
    }

    [HttpGet("decks/{deckId:guid}/cards")]
    public async Task<IActionResult> GetDeckSession(Guid deckId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetDeckSessionAsync(CurrentUserId(), deckId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<DeckSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("review")]
    public async Task<IActionResult> SubmitReview(SubmitReviewRequest request, CancellationToken cancellationToken)
    {
        var result = await _flashcards.SubmitReviewAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewResultDto>.Ok(result.Value!))
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
        if (result.Error is not FlashcardError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
