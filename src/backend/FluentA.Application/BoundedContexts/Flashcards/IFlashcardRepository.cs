using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;

namespace FluentA.Application.BoundedContexts.Flashcards;

public interface IFlashcardRepository
{
    Task<IReadOnlyList<FlashcardDeckDto>> ListDecksAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<DeckSessionDto?> GetDeckSessionAsync(Guid userId, Guid deckId, CancellationToken cancellationToken = default);
    Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
    Task<AddPracticeWordsToReviewDto?> AddPracticeWordsToReviewAsync(
        Guid userId,
        Guid deckId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
    Task<ReviewSessionCreatedDto?> CreateReviewSessionAsync(
        Guid userId,
        Guid boardId,
        string orderType,
        string mode,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        Guid sessionId,
        CancellationToken cancellationToken = default);
    Task<ReviewSessionSummaryDto?> GetReviewSessionSummaryAsync(Guid userId, Guid sessionId, CancellationToken cancellationToken = default);
    Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<PracticeSettingsDto> UpdatePracticeSettingsAsync(
        Guid userId,
        IReadOnlyList<string> modeSequence,
        CancellationToken cancellationToken = default);
    Task<ReviewSettingsDto> GetReviewSettingsAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<ReviewSettingsDto> UpdateReviewSettingsAsync(
        Guid userId,
        int dailyLimit,
        bool recapAfterAnswer,
        CancellationToken cancellationToken = default);
    Task<FlashcardDashboardDto?> GetDashboardAsync(
        Guid userId,
        Guid? boardId,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default);
    Task<ReviewResultDto?> AddReviewAsync(
        Guid userId,
        Guid sessionId,
        Guid wordId,
        bool correct,
        int timeSpentSeconds,
        TimeZoneInfo timeZone,
        CancellationToken cancellationToken = default);
}
