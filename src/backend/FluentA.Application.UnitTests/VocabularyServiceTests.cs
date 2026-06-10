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
    public async Task UpdateListAndDeleteBoardPageAndWords_UseOwnedEntities()
    {
        var repository = new FakeVocabularyRepository();
        var notifier = new RecordingFlashcardSyncNotifier();
        var service = new VocabularyService(repository, notifier);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var created = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb"));
        notifier.UpdatedDeckGroups.Clear();

        var listedBoards = await service.ListBoardsAsync(userId);
        var listedPages = await service.ListPagesAsync(userId, board.Value.Id);
        var listedWords = await service.ListWordsAsync(userId, board.Value.Id, page.Value.Id);
        var updatedBoard = await service.UpdateBoardAsync(userId, board.Value.Id, new UpdateBoardRequest("HSK", "zh", 9));
        var updatedPage = await service.UpdatePageAsync(userId, board.Value.Id, page.Value.Id, new UpdatePageRequest("Lesson 2", 3));
        var deletedWord = await service.DeleteWordAsync(userId, board.Value.Id, created.Value!.Id);
        var deletedPage = await service.DeletePageAsync(userId, board.Value.Id, page.Value.Id);
        var deletedBoard = await service.DeleteBoardAsync(userId, board.Value.Id);

        Assert.Single(listedBoards.Value!);
        Assert.Empty(listedPages.Value!);
        Assert.Equal("mitigate", Assert.Single(listedWords.Value!).Word);
        Assert.Equal("HSK", updatedBoard.Value!.Name);
        Assert.Equal("zh", updatedBoard.Value.Language);
        Assert.Equal(9, updatedBoard.Value.SortOrder);
        Assert.Equal("Lesson 2", updatedPage.Value!.Name);
        Assert.Equal(3, updatedPage.Value.SortOrder);
        Assert.True(deletedWord.Value);
        Assert.True(deletedPage.Value);
        Assert.True(deletedBoard.Value);
        Assert.Single(notifier.UpdatedDeckGroups);
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

    [Fact]
    public async Task CustomColumnConfiguration_IsBoardWideTypedAndUserPrivate()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var column = await service.CreateCustomColumnAsync(userId, board.Value.Id, new CreateCustomColumnRequest("Priority", "number"));
        var created = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb") with
        {
            CustomValues = [new CustomValueRequest(column.Value!.Id, "3.5")]
        });
        var hidden = await service.UpdateColumnVisibilityAsync(userId, board.Value.Id, new UpdateColumnVisibilityRequest(["note", $"custom:{column.Value.Id}"]));

        Assert.Equal("3.5", Assert.Single(created.Value!.CustomValues).Value);
        Assert.Equal(2, hidden.Value!.HiddenColumnKeys.Count);
        Assert.Empty((await service.GetColumnConfigurationAsync(Guid.NewGuid(), board.Value.Id)).Value?.CustomColumns ?? []);
    }

    [Fact]
    public async Task CustomNumber_RejectsValuesOutsideDatabasePrecision()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var column = await service.CreateCustomColumnAsync(userId, board.Value.Id, new CreateCustomColumnRequest("Priority", "number"));

        var result = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb") with
        {
            CustomValues = [new CustomValueRequest(column.Value!.Id, "1.23456")]
        });

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    [Fact]
    public async Task CustomColumnConfiguration_RejectsInvalidDuplicateAndMissingInputs()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var column = await service.CreateCustomColumnAsync(userId, board.Value!.Id, new CreateCustomColumnRequest("Priority", "number"));

        var duplicate = await service.CreateCustomColumnAsync(userId, board.Value.Id, new CreateCustomColumnRequest(" priority ", "number"));
        var invalidType = await service.CreateCustomColumnAsync(userId, board.Value.Id, new CreateCustomColumnRequest("Register", "date"));
        var invalidVisibility = await service.UpdateColumnVisibilityAsync(userId, board.Value.Id, new UpdateColumnVisibilityRequest(["missing"]));
        var missingDelete = await service.DeleteCustomColumnAsync(userId, board.Value.Id, Guid.NewGuid());
        var deleted = await service.DeleteCustomColumnAsync(userId, board.Value.Id, column.Value!.Id);

        Assert.False(duplicate.IsSuccess);
        Assert.False(invalidType.IsSuccess);
        Assert.False(invalidVisibility.IsSuccess);
        Assert.False(missingDelete.IsSuccess);
        Assert.True(deleted.Value);
    }

    [Fact]
    public async Task UpdateWordCell_ChangesOnlyNamedCellAndCustomCellDoesNotNotifyCards()
    {
        var repository = new FakeVocabularyRepository();
        var notifier = new RecordingFlashcardSyncNotifier();
        var service = new VocabularyService(repository, notifier);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var column = await service.CreateCustomColumnAsync(userId, board.Value.Id, new CreateCustomColumnRequest("Priority", "number"));
        var created = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb"));
        notifier.SavedWords.Clear();
        notifier.UpdatedDeckGroups.Clear();

        var fixedUpdate = await service.UpdateWordCellAsync(userId, board.Value.Id, created.Value!.Id, new UpdateWordCellRequest("meaningEn", "reduce harm"));
        var customUpdate = await service.UpdateWordCellAsync(userId, board.Value.Id, created.Value.Id, new UpdateWordCellRequest($"custom:{column.Value!.Id}", "4.5"));

        Assert.Equal("mitigate", fixedUpdate.Value!.Word);
        Assert.Equal("reduce harm", fixedUpdate.Value.MeaningEn);
        Assert.Equal("4.5", Assert.Single(customUpdate.Value!.CustomValues).Value);
        Assert.Single(notifier.SavedWords);
        Assert.Single(notifier.UpdatedDeckGroups);
    }

    [Fact]
    public async Task UpdateWordCell_RejectsInvalidRequiredValue()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var created = await service.CreateWordAsync(userId, board.Value.Id, page.Value!.Id, Word("mitigate", "verb"));

        var result = await service.UpdateWordCellAsync(userId, board.Value.Id, created.Value!.Id, new UpdateWordCellRequest("word", ""));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
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
        public List<VocabCustomColumn> Columns { get; } = [];
        public List<VocabCustomValue> CustomValues { get; } = [];
        public List<VocabColumnVisibility> Visibility { get; } = [];
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

        public Task<IReadOnlyList<VocabCustomColumn>> ListCustomColumnsAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<VocabCustomColumn>>(
                _boards.Any(board => board.Id == boardId && board.UserId == userId)
                    ? Columns.Where(column => column.BoardId == boardId).ToList()
                    : []);

        public Task<IReadOnlyList<VocabCustomValue>> ListCustomValuesAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default)
        {
            var ids = wordIds.ToHashSet();
            return Task.FromResult<IReadOnlyList<VocabCustomValue>>(CustomValues.Where(value => ids.Contains(value.WordId)).ToList());
        }

        public Task<IReadOnlyList<VocabColumnVisibility>> ListColumnVisibilityAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<VocabColumnVisibility>>(Visibility.Where(value => value.UserId == userId && value.BoardId == boardId).ToList());

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

        public Task<int> NextCustomColumnSortOrderAsync(Guid boardId, CancellationToken cancellationToken = default) =>
            Task.FromResult(Columns.Count(column => column.BoardId == boardId));

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

        public Task AddWordAsync(VocabWord word, IReadOnlyList<VocabCustomValue>? customValues = null, CancellationToken cancellationToken = default)
        {
            if (FailWordCommits)
            {
                throw new InvalidOperationException("Simulated commit failure.");
            }

            Words.Add(word);
            CustomValues.AddRange(customValues ?? []);
            return Task.CompletedTask;
        }

        public Task AddCustomColumnAsync(VocabCustomColumn column, CancellationToken cancellationToken = default)
        {
            Columns.Add(column);
            return Task.CompletedTask;
        }

        public Task ReplaceColumnVisibilityAsync(Guid userId, Guid boardId, IReadOnlyList<VocabColumnVisibility> preferences, CancellationToken cancellationToken = default)
        {
            Visibility.RemoveAll(value => value.UserId == userId && value.BoardId == boardId);
            Visibility.AddRange(preferences);
            return Task.CompletedTask;
        }

        public Task<bool> DeleteCustomColumnAsync(Guid userId, Guid boardId, Guid columnId, CancellationToken cancellationToken = default)
        {
            var removed = Columns.RemoveAll(column => column.Id == columnId && column.BoardId == boardId) > 0;
            CustomValues.RemoveAll(value => value.ColumnId == columnId);
            Visibility.RemoveAll(value => value.BoardId == boardId && value.ColumnKey == $"custom:{columnId}".ToLowerInvariant());
            return Task.FromResult(removed);
        }

        public Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default) => Task.CompletedTask;

        public Task UpdateWordAsync(VocabWord word, IReadOnlyList<VocabCustomValue>? customValues = null, CancellationToken cancellationToken = default)
        {
            if (customValues is not null)
            {
                CustomValues.RemoveAll(value => value.WordId == word.Id);
                CustomValues.AddRange(customValues);
            }
            return Task.CompletedTask;
        }

        public Task UpdateCustomValueAsync(Guid wordId, Guid columnId, VocabCustomValue? value, CancellationToken cancellationToken = default)
        {
            CustomValues.RemoveAll(item => item.WordId == wordId && item.ColumnId == columnId);
            if (value is not null)
            {
                CustomValues.Add(value);
            }
            return Task.CompletedTask;
        }

        public Task UpdateFixedCellAsync(VocabWord word, string columnKey, CancellationToken cancellationToken = default) => Task.CompletedTask;

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
