using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Practice;

public sealed class EfPracticeRepository : IPracticeRepository
{
    private readonly AppDbContext _dbContext;

    public EfPracticeRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
        Guid userId,
        Guid deckId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var deck = await (
            from flashcardDeck in _dbContext.FlashcardDecks
            join board in _dbContext.Boards on flashcardDeck.BoardId equals board.Id
            where flashcardDeck.Id == deckId
                && flashcardDeck.UserId == userId
                && flashcardDeck.Type == DeckType.PageDeck
                && flashcardDeck.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                flashcardDeck.Id,
                flashcardDeck.UserId,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (deck is null)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.DeckNotFound, null);
        }

        var actualCardCount = await _dbContext.FlashcardCards
            .AsNoTracking()
            .CountAsync(card => card.DeckId == deck.Id && card.DeletedAt == null, cancellationToken);

        if (actualCardCount != totalCards || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.InconsistentSummary, null);
        }

        var summary = PracticeSessionSummary.Create(
            deck.UserId,
            deck.Id,
            mode,
            totalCards,
            correctCards,
            wrongCards,
            DateTime.UtcNow);
        await _dbContext.PracticeSessionSummaries.AddAsync(summary, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new PracticeSessionSummarySaveResult(
            PracticeSessionSummarySaveStatus.Success,
            new PracticeSessionSummaryDto(
                summary.Id,
                summary.UserId,
                summary.DeckId,
                summary.Mode switch
                {
                    PracticeMode.Dictation => "dictation",
                    PracticeMode.MeaningToWord => "meaningToWord",
                    PracticeMode.Pronunciation => "pronunciation",
                    _ => throw new InvalidOperationException("Unknown practice mode."),
                },
                summary.TotalCards,
                summary.CorrectCards,
                summary.WrongCards,
                summary.CompletedAt));
    }

    public async Task<PracticeSettingsDto> GetPracticeSettingsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PracticeSettings
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        return settings is null
            ? new PracticeSettingsDto(PracticeSettings.DefaultModeSequence)
            : new PracticeSettingsDto(settings.ModeSequence);
    }

    public async Task<PracticeSettingsDto> UpdatePracticeSettingsAsync(
        Guid userId,
        IReadOnlyList<string> modeSequence,
        CancellationToken cancellationToken = default)
    {
        var settings = await _dbContext.PracticeSettings.SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (settings is null)
        {
            settings = PracticeSettings.Create(userId, modeSequence);
            await _dbContext.PracticeSettings.AddAsync(settings, cancellationToken);
        }
        else
        {
            settings.Update(modeSequence);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return new PracticeSettingsDto(settings.ModeSequence);
    }
}
