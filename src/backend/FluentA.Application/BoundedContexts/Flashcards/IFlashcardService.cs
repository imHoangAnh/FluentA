using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardService
{
    /// <summary>Lists synchronized flashcard decks for a user.</summary>
    Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Returns cards and metadata for a deck review session.</summary>
    Task<OperationResult<DeckSessionDto>> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default);
    /// <summary>Creates a server-side review session for a deck.</summary>
    Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Returns a review session summary owned by the user.</summary>
    Task<OperationResult<ReviewSessionSummaryDto>> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);
    /// <summary>Returns the user's global review settings.</summary>
    Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Updates the user's global review settings.</summary>
    Task<OperationResult<ReviewSettingsDto>> UpdateReviewSettingsAsync(
        Guid userId,
        UpdateReviewSettingsRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Builds the due-card queue for a deck and time zone.</summary>
    Task<OperationResult<DueDeckDto>> GetDueDeckAsync(
        Guid userId,
        Guid deckId,
        string? timeZoneId,
        CancellationToken cancellationToken = default);
    /// <summary>Returns dashboard metrics for all boards or one board.</summary>
    Task<OperationResult<FlashcardDashboardDto>> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        string? timeZoneId,
        CancellationToken cancellationToken = default);
    /// <summary>Records a card review rating and returns the scheduling result.</summary>
    Task<OperationResult<ReviewResultDto>> SubmitReviewAsync(
        Guid userId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken = default);
}
