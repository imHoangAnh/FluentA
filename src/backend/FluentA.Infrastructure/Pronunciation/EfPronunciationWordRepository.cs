using FluentA.Application.BoundedContexts.Pronunciation;
using FluentA.Application.BoundedContexts.Pronunciation.DTOs;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Pronunciation;

public sealed class EfPronunciationWordRepository : IPronunciationWordRepository
{
    private readonly AppDbContext _dbContext;

    public EfPronunciationWordRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<PronunciationTarget?> FindOwnedWordAsync(
        Guid userId,
        Guid wordId,
        CancellationToken cancellationToken = default)
    {
        return (
            from word in _dbContext.Words.AsNoTracking()
            join page in _dbContext.Pages.AsNoTracking() on word.PageId equals page.Id
            join board in _dbContext.Boards.AsNoTracking() on page.BoardId equals board.Id
            where word.Id == wordId
                && board.UserId == userId
                && word.DeletedAt == null
                && page.DeletedAt == null
                && board.DeletedAt == null
            select new PronunciationTarget(word.Word, board.Language))
            .SingleOrDefaultAsync(cancellationToken);
    }
}
