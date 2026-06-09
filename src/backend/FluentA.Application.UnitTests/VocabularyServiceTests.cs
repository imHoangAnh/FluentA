using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.UnitTests;

public sealed class VocabularyServiceTests
{
    [Fact]
    public async Task CreateBoard_CreatesAllWordsDeck()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();

        var result = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS Vocabulary", "en"));

        Assert.True(result.IsSuccess);
        Assert.Equal("IELTS Vocabulary", result.Value!.Name);
        Assert.Single(repository.Decks);
        Assert.Equal(DeckType.AllWords, repository.Decks[0].Type);
        Assert.Equal(result.Value.Id, repository.Decks[0].BoardId);
    }

    [Fact]
    public async Task CreatePage_CreatesPageDeck()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));

        var result = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1 - Education"));

        Assert.True(result.IsSuccess);
        Assert.Equal("Unit 1 - Education", result.Value!.Name);
        Assert.Equal(2, repository.Decks.Count);
        Assert.Equal(DeckType.PageDeck, repository.Decks[1].Type);
        Assert.Equal(result.Value.Id, repository.Decks[1].PageId);
    }

    [Fact]
    public async Task CreateBoard_RejectsInvalidLanguage()
    {
        var service = new VocabularyService(new FakeVocabularyRepository());

        var result = await service.CreateBoardAsync(Guid.NewGuid(), new CreateBoardRequest("IELTS", "x"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    private sealed class FakeVocabularyRepository : IVocabularyRepository
    {
        private readonly List<VocabBoard> _boards = [];
        private readonly List<VocabPage> _pages = [];
        public List<FlashcardDeck> Decks { get; } = [];

        public Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<VocabBoard>>(_boards.Where(board => board.UserId == userId).ToList());
        }

        public Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
        {
            var board = _boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null);
            return Task.FromResult(board);
        }

        public Task<VocabPage?> GetPageAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
        {
            var page = _pages.FirstOrDefault(page => page.BoardId == boardId && page.Id == pageId && page.DeletedAt is null);
            return Task.FromResult(page);
        }

        public Task<int> NextBoardSortOrderAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_boards.Count(board => board.UserId == userId));
        }

        public Task<int> NextPageSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_pages.Count(page => page.BoardId == boardId));
        }

        public Task AddBoardWithDeckAsync(VocabBoard board, FlashcardDeck deck, CancellationToken cancellationToken = default)
        {
            _boards.Add(board);
            Decks.Add(deck);
            return Task.CompletedTask;
        }

        public Task AddPageWithDeckAsync(VocabPage page, FlashcardDeck deck, CancellationToken cancellationToken = default)
        {
            _pages.Add(page);
            Decks.Add(deck);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task SoftDeleteBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
        {
            board.SoftDelete();
            return Task.CompletedTask;
        }

        public Task SoftDeletePageAsync(VocabPage page, CancellationToken cancellationToken = default)
        {
            page.SoftDelete();
            return Task.CompletedTask;
        }
    }
}
