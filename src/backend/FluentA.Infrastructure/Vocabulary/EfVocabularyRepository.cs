using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Vocabulary;

public sealed class EfVocabularyRepository : IVocabularyRepository
{
    private readonly AppDbContext _dbContext;

    public EfVocabularyRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Boards
            .Include(board => board.Pages)
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .OrderBy(board => board.SortOrder)
            .ThenBy(board => board.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Boards
            .Include(board => board.Pages)
            .FirstOrDefaultAsync(board => board.Id == boardId && board.UserId == userId && board.DeletedAt == null, cancellationToken);
    }

    public async Task<VocabPage?> GetPageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
    {
        var board = await GetBoardAsync(userId, boardId, cancellationToken);
        return board?.Pages.FirstOrDefault(page => page.Id == pageId && page.DeletedAt is null);
    }

    public async Task<int> NextBoardSortOrderAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.Boards
            .Where(board => board.UserId == userId && board.DeletedAt == null)
            .Select(board => (int?)board.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task<int> NextPageSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
    {
        var maxSortOrder = await _dbContext.Pages
            .Where(page => page.BoardId == boardId && page.DeletedAt == null)
            .Select(page => (int?)page.SortOrder)
            .MaxAsync(cancellationToken);

        return (maxSortOrder ?? -1) + 1;
    }

    public async Task AddBoardWithDeckAsync(VocabBoard board, FlashcardDeck deck, CancellationToken cancellationToken = default)
    {
        await _dbContext.Boards.AddAsync(board, cancellationToken);
        await _dbContext.FlashcardDecks.AddAsync(deck, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddPageWithDeckAsync(VocabPage page, FlashcardDeck deck, CancellationToken cancellationToken = default)
    {
        await _dbContext.Pages.AddAsync(page, cancellationToken);
        await _dbContext.FlashcardDecks.AddAsync(deck, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        var allWordsDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.BoardId == board.Id && deck.Type == DeckType.AllWords && deck.DeletedAt == null, cancellationToken);
        allWordsDeck?.Rename($"{board.Name} - All Words");

        _dbContext.Boards.Update(board);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        var board = await _dbContext.Boards.FirstAsync(board => board.Id == page.BoardId, cancellationToken);
        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == page.Id && deck.DeletedAt == null, cancellationToken);
        pageDeck?.Rename($"{board.Name} - {page.Name}");

        _dbContext.Pages.Update(page);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeleteBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
    {
        board.SoftDelete();

        var pages = await _dbContext.Pages
            .Where(page => page.BoardId == board.Id && page.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var page in pages)
        {
            page.SoftDelete();
        }

        var decks = await _dbContext.FlashcardDecks
            .Where(deck => deck.BoardId == board.Id && deck.DeletedAt == null)
            .ToListAsync(cancellationToken);
        foreach (var deck in decks)
        {
            deck.SoftDelete();
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default)
    {
        page.SoftDelete();

        var pageDeck = await _dbContext.FlashcardDecks
            .FirstOrDefaultAsync(deck => deck.PageId == page.Id && deck.DeletedAt == null, cancellationToken);
        pageDeck?.SoftDelete();

        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
