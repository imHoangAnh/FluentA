using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FluentA.Infrastructure.Persistence.Repositories.Practice;

public sealed partial class EfPracticeRepository : IPracticeRepository, IPracticeSessionRepository
{
    private readonly AppDbContext _dbContext;

    public EfPracticeRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<PracticeSessionSummarySaveResult> CreatePracticeSessionSummaryAsync(
        Guid userId,
        Guid pageId,
        PracticeMode mode,
        int totalCards,
        int correctCards,
        int wrongCards,
        TimeZoneInfo timeZone,
        DateTime utcNow,
        CancellationToken cancellationToken = default)
    {
        var page = await (
            from pageEntity in _dbContext.Pages
            join board in _dbContext.Boards on pageEntity.BoardId equals board.Id
            where pageEntity.Id == pageId
                && board.UserId == userId
                && pageEntity.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                pageEntity.Id,
                board.UserId,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (page is null)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.PageNotFound, null);
        }

        var actualCardCount = await _dbContext.Words
            .AsNoTracking()
            .CountAsync(word => word.PageId == page.Id && word.DeletedAt == null, cancellationToken);

        if (actualCardCount != totalCards || correctCards < 0 || wrongCards < 0 || correctCards + wrongCards != totalCards)
        {
            return new PracticeSessionSummarySaveResult(PracticeSessionSummarySaveStatus.InconsistentSummary, null);
        }

        var summary = await _dbContext.PracticeSessionSummaries
            .Where(item => item.UserId == userId && item.PageId == page.Id && item.DeletedAt == null)
            .OrderBy(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (summary is null)
        {
            summary = PracticeSessionSummary.Create(
                page.UserId,
                page.Id,
                mode,
                totalCards,
                correctCards,
                wrongCards,
                utcNow);
            await _dbContext.PracticeSessionSummaries.AddAsync(summary, cancellationToken);
        }
        else
        {
            summary.UpdateCompletion(mode, totalCards, correctCards, wrongCards, utcNow);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new PracticeSessionSummarySaveResult(
            PracticeSessionSummarySaveStatus.Success,
            new PracticeSessionSummaryDto(
                summary.Id,
                summary.UserId,
                summary.PageId,
                summary.Mode switch
                {
                    PracticeMode.Dictation => "dictation",
                    PracticeMode.MeaningToWord => "meaningToWord",
                    PracticeMode.Pronunciation => "pronunciation",
                    PracticeMode.FixedSequence => "fixedSequence",
                    _ => throw new InvalidOperationException("Unknown practice mode."),
                },
                summary.TotalCards,
                summary.CorrectCards,
                summary.WrongCards,
                summary.CompletedAt));
    }

}
