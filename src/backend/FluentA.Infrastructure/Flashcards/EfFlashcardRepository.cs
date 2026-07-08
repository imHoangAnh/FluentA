using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Flashcards.DTOs;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Flashcards;

public sealed class EfFlashcardRepository : IFlashcardRepository
{
    private readonly AppDbContext _dbContext;

    public EfFlashcardRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<FlashcardBoardDto>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var boards = await _dbContext.Boards
            .AsNoTracking()
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderByDescending(board => board.CreatedAt)
            .Select(board => new
            {
                board.Id,
                board.Name,
                board.Language,
            })
            .ToListAsync(cancellationToken);

        var boardIds = boards.Select(board => board.Id).ToList();
        var pages = await _dbContext.Pages
            .AsNoTracking()
            .Where(page => boardIds.Contains(page.BoardId) && page.DeletedAt == null)
            .OrderByDescending(page => page.CreatedAt)
            .Select(page => new
            {
                page.Id,
                page.BoardId,
                page.Name,
            })
            .ToListAsync(cancellationToken);

        var pageIds = pages.Select(page => page.Id).ToList();
        var words = await _dbContext.Words
            .AsNoTracking()
            .Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == null)
            .OrderBy(word => word.CreatedAt)
            .Select(word => new
            {
                word.Id,
                word.PageId,
                word.Word,
                WordClass = word.Class,
                MeaningVn = word.MeaningVn,
                MeaningEn = word.Definition,
                word.Example,
                Thesaurus = word.Synonyms,
                Collocation = word.Antonyms,
                word.Note,
            })
            .ToListAsync(cancellationToken);

        var reviewStates = await LoadReviewStatesAsync(userId, words.Select(word => word.Id), cancellationToken);
        var practicedPageIds = await LoadPracticedPageIdsAsync(userId, pageIds, cancellationToken);
        var wordsByPage = words
            .GroupBy(word => word.PageId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<FlashcardCardDto>)group
                    .Select(word => ToWordDto(
                        word.Id,
                        word.Word,
                        word.WordClass.ToString(),
                        word.MeaningVn,
                        word.MeaningEn ?? string.Empty,
                        word.Example,
                        word.Thesaurus,
                        word.Collocation,
                        word.Note,
                        reviewStates.ContainsKey(word.Id),
                        reviewStates.GetValueOrDefault(word.Id)))
                    .ToList());

        var pagesByBoard = pages
            .GroupBy(page => page.BoardId)
            .ToDictionary(
                group => group.Key,
                group => (IReadOnlyList<FlashcardPageDto>)group
                    .Select(page => new FlashcardPageDto(
                        page.Id,
                        page.Name,
                        practicedPageIds.Contains(page.Id),
                        wordsByPage.GetValueOrDefault(page.Id) ?? []))
                    .ToList());

        return boards
            .Select(board => new FlashcardBoardDto(
                board.Id,
                board.Name,
                board.Language,
                pagesByBoard.GetValueOrDefault(board.Id) ?? []))
            .ToList();
    }

    public async Task<PageSessionDto?> GetPageSessionAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var page = await (
            from pageEntity in _dbContext.Pages.AsNoTracking()
            join board in _dbContext.Boards.AsNoTracking() on pageEntity.BoardId equals board.Id
            where pageEntity.Id == pageId
                && board.UserId == userId
                && pageEntity.DeletedAt == null
                && board.DeletedAt == null
            select new
            {
                PageId = pageEntity.Id,
                BoardId = board.Id,
                PageName = pageEntity.Name,
                BoardLanguage = board.Language,
            })
            .SingleOrDefaultAsync(cancellationToken);

        if (page is null)
        {
            return null;
        }

        var words = await _dbContext.Words
            .AsNoTracking()
            .Where(word => word.PageId == page.PageId && word.DeletedAt == null)
            .OrderBy(word => word.CreatedAt)
            .Select(word => new
            {
                word.Id,
                word.Word,
                WordClass = word.Class,
                MeaningVn = word.MeaningVn,
                MeaningEn = word.Definition,
                word.Example,
                Thesaurus = word.Synonyms,
                Collocation = word.Antonyms,
                word.Note,
            })
            .ToListAsync(cancellationToken);

        var reviewStates = await LoadReviewStatesAsync(userId, words.Select(word => word.Id), cancellationToken);
        return new PageSessionDto(
            page.PageId,
            page.BoardId,
            page.PageName,
            page.BoardLanguage,
            words.Select(word => ToWordDto(
                word.Id,
                word.Word,
                word.WordClass.ToString(),
                word.MeaningVn,
                word.MeaningEn ?? string.Empty,
                word.Example,
                word.Thesaurus,
                word.Collocation,
                word.Note,
                reviewStates.ContainsKey(word.Id),
                reviewStates.GetValueOrDefault(word.Id)))
                .ToList());
    }

    private async Task<Dictionary<Guid, WordReviewState>> LoadReviewStatesAsync(
        Guid userId,
        IEnumerable<Guid> wordIds,
        CancellationToken cancellationToken)
    {
        var ids = wordIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        return await _dbContext.WordReviewStates
            .AsNoTracking()
            .Where(state => state.UserId == userId && state.DeletedAt == null && state.Status == WordReviewStatus.Active && ids.Contains(state.WordId))
            .ToDictionaryAsync(state => state.WordId, cancellationToken);
    }

    private async Task<HashSet<Guid>> LoadPracticedPageIdsAsync(
        Guid userId,
        IEnumerable<Guid> pageIds,
        CancellationToken cancellationToken)
    {
        var ids = pageIds.Distinct().ToList();
        if (ids.Count == 0)
        {
            return [];
        }

        var practiced = await _dbContext.PracticeSessionSummaries
            .AsNoTracking()
            .Where(summary => summary.UserId == userId && summary.DeletedAt == null && ids.Contains(summary.PageId))
            .Select(summary => summary.PageId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return [.. practiced];
    }

    private static FlashcardCardDto ToWordDto(
        Guid wordId,
        string word,
        string wordClass,
        string meaningVn,
        string meaningEn,
        string example,
        string? thesaurus,
        string? collocation,
        string? note,
        bool isInReview,
        WordReviewState? reviewState) =>
        new(
            wordId,
            wordId,
            word,
            wordClass,
            meaningVn,
            meaningEn,
            example,
            thesaurus,
            collocation,
            note,
            isInReview,
            reviewState?.Level,
            reviewState?.NextReviewDate,
            reviewState?.LapseCount ?? 0);
}
