using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Application.BoundedContexts.Flashcards;
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

    [Fact]
    public async Task CreateUpdateDeleteWord_UsesOwnedPage()
    {
        var repository = new FakeVocabularyRepository();
        var notifier = new RecordingFlashcardSyncNotifier();
        var service = new VocabularyService(repository, notifier);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var created = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb"));
        var updated = await service.UpdateWordAsync(userId, board.Value.Id, created.Value!.Id, Word("mitigation", "noun"));
        var deleted = await service.DeleteWordAsync(userId, board.Value.Id, created.Value.Id);

        Assert.True(created.IsSuccess);
        Assert.Equal("mitigation", updated.Value!.Word);
        Assert.Equal("noun", updated.Value.Class);
        Assert.True(deleted.IsSuccess);
        Assert.DoesNotContain(repository.Words, word => word.DeletedAt is null);
        Assert.Equal(2, notifier.SavedWords.Count);
        Assert.Equal(3, notifier.UpdatedDeckGroups.Count);
        Assert.All(notifier.UpdatedDeckGroups, update => Assert.Equal(2, update.DeckIds.Count));
    }

    [Fact]
    public async Task CreateWord_RejectsInvalidClass()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var result = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "adjective"));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    [Fact]
    public async Task CreateWord_DoesNotNotifyWhenValidationFails()
    {
        var notifier = new RecordingFlashcardSyncNotifier();
        var service = new VocabularyService(new FakeVocabularyRepository(), notifier);

        var result = await service.CreateWordAsync(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Word("mitigate", "invalid"));

        Assert.False(result.IsSuccess);
        Assert.Empty(notifier.SavedWords);
        Assert.Empty(notifier.UpdatedDeckGroups);
    }

    [Fact]
    public async Task CreateWord_DoesNotNotifyWhenRepositoryCommitFails()
    {
        var repository = new FakeVocabularyRepository();
        var notifier = new RecordingFlashcardSyncNotifier();
        var service = new VocabularyService(repository, notifier);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        repository.FailWordCommits = true;

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb")));

        Assert.Empty(notifier.SavedWords);
        Assert.Empty(notifier.UpdatedDeckGroups);
    }

    private static WordRequest Word(string word, string wordClass)
    {
        return new WordRequest(word, "nghĩa tiếng Việt", "English meaning", wordClass, "Example sentence.");
    }

    private sealed class FakeVocabularyRepository : IVocabularyRepository
    {
        private readonly List<VocabBoard> _boards = [];
        private readonly List<VocabPage> _pages = [];
        public List<FlashcardDeck> Decks { get; } = [];
        public List<VocabWord> Words { get; } = [];
        public bool FailWordCommits { get; set; }

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

        public Task<VocabWord?> GetWordAsync(Guid userId, Guid boardId, Guid wordId, CancellationToken cancellationToken = default)
        {
            var ownedPageIds = _pages
                .Where(page => page.BoardId == boardId && page.DeletedAt is null)
                .Select(page => page.Id)
                .ToHashSet();
            return Task.FromResult(Words.FirstOrDefault(word => word.Id == wordId && ownedPageIds.Contains(word.PageId) && word.DeletedAt is null));
        }

        public Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<VocabWord>>(Words.Where(word => word.PageId == pageId && word.DeletedAt is null).ToList());
        }

        public Task<IReadOnlyList<Guid>> ListActiveDeckIdsAsync(Guid boardId, Guid pageId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<Guid>>(Decks
                .Where(deck => deck.BoardId == boardId
                    && deck.DeletedAt is null
                    && (deck.Type == DeckType.AllWords || deck.PageId == pageId))
                .Select(deck => deck.Id)
                .ToList());
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

        public Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default)
        {
            if (FailWordCommits)
            {
                throw new InvalidOperationException("Simulated commit failure.");
            }

            Words.Add(word);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default) => Task.CompletedTask;

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

        public Task SoftDeleteWordAsync(VocabWord word, CancellationToken cancellationToken = default)
        {
            word.SoftDelete();
            return Task.CompletedTask;
        }
    }

    private sealed class RecordingFlashcardSyncNotifier : IFlashcardSyncNotifier
    {
        public List<(Guid UserId, Guid WordId, Guid PageId)> SavedWords { get; } = [];
        public List<(Guid UserId, Guid BoardId, IReadOnlyList<Guid> DeckIds)> UpdatedDeckGroups { get; } = [];

        public Task WordSavedAsync(Guid userId, Guid wordId, Guid pageId, CancellationToken cancellationToken = default)
        {
            SavedWords.Add((userId, wordId, pageId));
            return Task.CompletedTask;
        }

        public Task DecksUpdatedAsync(Guid userId, Guid boardId, IReadOnlyList<Guid> deckIds, CancellationToken cancellationToken = default)
        {
            UpdatedDeckGroups.Add((userId, boardId, deckIds));
            return Task.CompletedTask;
        }
    }
}
