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

    /// <summary>Lists synchronized flashcard decks for the authenticated user.</summary>
    [HttpGet("decks")]
    public async Task<IActionResult> ListDecks(CancellationToken cancellationToken)
    {
        var decks = await _flashcards.ListDecksAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<IReadOnlyList<FlashcardDeckDto>>.Ok(decks));
    }

    /// <summary>Returns cards for a review deck session setup.</summary>
    [HttpGet("decks/{deckId:guid}/cards")]
    public async Task<IActionResult> GetDeckSession(Guid deckId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetDeckSessionAsync(CurrentUserId(), deckId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<DeckSessionDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns due cards for an All Words spaced-review deck.</summary>
    [HttpGet("decks/{deckId:guid}/due")]
    public async Task<IActionResult> GetDueDeck(Guid deckId, [FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetDueDeckAsync(CurrentUserId(), deckId, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<DueDeckDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a server-side review session.</summary>
    [HttpPost("sessions")]
    public async Task<IActionResult> CreateReviewSession(CreateReviewSessionRequest request, CancellationToken cancellationToken)
    {
        var result = await _flashcards.CreateReviewSessionAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionCreatedDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns a completed review session summary.</summary>
    [HttpGet("sessions/{sessionId:guid}/summary")]
    public async Task<IActionResult> GetReviewSessionSummary(Guid sessionId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetReviewSessionSummaryAsync(CurrentUserId(), sessionId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSessionSummaryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns global flashcard dashboard metrics.</summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard([FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetDashboardAsync(CurrentUserId(), boardId: null, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<FlashcardDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns flashcard dashboard metrics scoped to one board.</summary>
    [HttpGet("dashboard/{boardId:guid}")]
    public async Task<IActionResult> GetBoardDashboard(Guid boardId, [FromQuery] string? timeZoneId, CancellationToken cancellationToken)
    {
        var result = await _flashcards.GetDashboardAsync(CurrentUserId(), boardId, timeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<FlashcardDashboardDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Returns the authenticated user's review settings.</summary>
    [HttpGet("settings")]
    public async Task<IActionResult> GetReviewSettings(CancellationToken cancellationToken)
    {
        var settings = await _flashcards.GetReviewSettingsAsync(CurrentUserId(), cancellationToken);
        return Ok(ApiEnvelope<ReviewSettingsDto>.Ok(settings));
    }

    /// <summary>Updates the authenticated user's review settings.</summary>
    [HttpPut("settings")]
    public async Task<IActionResult> UpdateReviewSettings(UpdateReviewSettingsRequest request, CancellationToken cancellationToken)
    {
        var result = await _flashcards.UpdateReviewSettingsAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<ReviewSettingsDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Records a review rating for a card in a review session.</summary>
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
