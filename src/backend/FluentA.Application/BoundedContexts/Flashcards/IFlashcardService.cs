using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardService
{
    /// <summary>Lists synchronized flashcard decks for a user.</summary>
    Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Returns cards and metadata for a deck review session.</summary>
    Task<OperationResult<DeckSessionDto>> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default);
    /// <summary>Persists a completed practice-session summary for an owned deck.</summary>
    Task<OperationResult<PracticeSessionSummaryDto>> CreatePracticeSessionSummaryAsync(
        Guid userId,
        CreatePracticeSessionSummaryRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Adds completed practice words without SRS state to review.</summary>
    Task<OperationResult<AddPracticeWordsToReviewDto>> AddPracticeWordsToReviewAsync(
        Guid userId,
        AddPracticeWordsToReviewRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Creates a server-side review session for one board.</summary>
    Task<OperationResult<ReviewSessionCreatedDto>> CreateReviewSessionAsync(
        Guid userId,
        CreateReviewSessionRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Returns a review session summary owned by the user.</summary>
    Task<OperationResult<ReviewSessionSummaryDto>> GetReviewSessionSummaryAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);
    /// <summary>Returns the user's global practice settings.</summary>
    Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Updates the user's global practice settings.</summary>
    Task<OperationResult<PracticeSettingsDto>> UpdatePracticeSettingsAsync(
        Guid userId,
        UpdatePracticeSettingsRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Returns the user's global review settings.</summary>
    Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>Updates the user's global review settings.</summary>
    Task<OperationResult<ReviewSettingsDto>> UpdateReviewSettingsAsync(
        Guid userId,
        UpdateReviewSettingsRequest request,
        CancellationToken cancellationToken = default);
    /// <summary>Returns dashboard metrics for all boards or one board.</summary>
    Task<OperationResult<FlashcardDashboardDto>> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        string? timeZoneId,
        CancellationToken cancellationToken = default);
    /// <summary>Records a review answer and returns the scheduling result.</summary>
    Task<OperationResult<ReviewResultDto>> SubmitReviewAsync(
        Guid userId,
        SubmitReviewRequest request,
        CancellationToken cancellationToken = default);
}
