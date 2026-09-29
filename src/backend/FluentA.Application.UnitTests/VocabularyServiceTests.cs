using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Application.BoundedContexts.Vocabulary.DTOs;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;

namespace FluentA.Application.UnitTests;

public sealed class VocabularyServiceTests
{
    [Fact]
    public async Task CreateBoard_ReturnsDefaultVocabularyPreferences()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);

        var result = await service.CreateBoardAsync(Guid.NewGuid(), new CreateBoardRequest("IELTS Vocabulary", "en"));

        Assert.True(result.IsSuccess);
        Assert.Equal("word", result.Value!.Preferences.ColumnOrder[0]);
    }

    [Fact]
    public async Task CreatePage_UsesVocabularyPageAsLearningDeck()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));

        var result = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1 - Education"));

        Assert.True(result.IsSuccess);
        Assert.Equal(board.Value.Id, result.Value!.BoardId);
        Assert.Equal("Unit 1 - Education", result.Value.Name);
    }

    [Fact]
    public async Task BoardAndPageLists_ReturnNewestFirst()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var olderBoard = await service.CreateBoardAsync(userId, new CreateBoardRequest("Older", "en"));
        await Task.Delay(2);
        var newerBoard = await service.CreateBoardAsync(userId, new CreateBoardRequest("Newer", "fr"));
        await Task.Delay(2);
        var boardWithPages = VocabBoard.Create(userId, "Pages", "en");
        var olderPage = boardWithPages.AddPage("Older page");
        await Task.Delay(2);
        var newerPage = boardWithPages.AddPage("Newer page");
        await repository.AddBoardAsync(boardWithPages);

        var boards = await service.ListBoardsAsync(userId);
        var board = await service.GetBoardAsync(userId, boardWithPages.Id);

        Assert.Equal([boardWithPages.Id, newerBoard.Value!.Id, olderBoard.Value!.Id], boards.Value!.Select(item => item.Id));
        Assert.Equal([newerPage.Id, olderPage.Id], board.Value!.Pages.Select(item => item.Id));
    }

    [Fact]
    public async Task CreateUpdateDeleteWord_UsesOwnedEntities()
    {
        var repository = new FakeVocabularyRepository();
        var reviewCleanup = new RecordingVocabularyReviewCleanupPort();
        var service = new VocabularyService(repository, reviewCleanup);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var created = await service.CreateWordAsync(userId, page.Value!.Id, Word("mitigate", "verb"));
        var updated = await service.UpdateWordAsync(userId, created.Value!.Id, new WordPatchRequest(
            Word: "mitigation",
            Meaning: "nghia tieng Viet",
            IpaPronunciation: "/mItI'geISn/",
            Type: "noun",
            Context: "risk reduction",
            Example: "Example sentence.",
            Synonyms: "reduction",
            Antonyms: "aggravation"));
        var deleted = await service.DeleteWordAsync(userId, created.Value.Id);

        Assert.True(created.IsSuccess);
        Assert.Equal("/mItI'geISn/", updated.Value!.IpaPronunciation);
        Assert.Equal("reduction", updated.Value.Synonyms);
        Assert.True(deleted.IsSuccess);
        Assert.DoesNotContain(repository.Words, word => word.DeletedAt is null);
        Assert.Equal([created.Value.Id], reviewCleanup.RemovedWordIds);
    }

    [Theory]
    [InlineData("invalid")]
    public async Task CreateWord_RejectsUnsupportedType(string wordType)
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var result = await service.CreateWordAsync(userId, page.Value!.Id, Word("mitigate", wordType));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    [Theory]
    [InlineData("noun")]
    [InlineData("verb")]
    [InlineData("adjective")]
    [InlineData("adverb")]
    [InlineData("conjunction")]
    [InlineData("preposition")]
    [InlineData("phrase")]
    [InlineData("collocation")]
    [InlineData("expression")]
    [InlineData("slang")]
    [InlineData("phrasalverb")]
    [InlineData("idiom")]
    [InlineData("nounphrase")]
    [InlineData("verbphrase")]
    [InlineData("other")]
    public async Task CreateWord_AcceptsAndReturnsSupportedTypes(string wordType)
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("Expressions", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var result = await service.CreateWordAsync(userId, page.Value!.Id, Word("take part", wordType));

        Assert.True(result.IsSuccess);
        Assert.Equal(wordType, result.Value!.Type);
    }

    [Theory]
    [InlineData("adj", "adjective")]
    [InlineData("adv", "adverb")]
    [InlineData("proverb", "expression")]
    public async Task CreateWord_AcceptsLegacyTypeAliasesAndReturnsCanonicalType(string alias, string canonicalType)
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("Expressions", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));

        var result = await service.CreateWordAsync(userId, page.Value!.Id, Word("take part", alias));

        Assert.True(result.IsSuccess);
        Assert.Equal(canonicalType, result.Value!.Type);
    }

    [Theory]
    [InlineData("adj", "adjective")]
    [InlineData("adv", "adverb")]
    [InlineData("proverb", "expression")]
    public async Task UpdateWordPatch_AcceptsLegacyTypeAliasesAndReturnsCanonicalType(string alias, string canonicalType)
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("Expressions", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var created = await service.CreateWordAsync(userId, page.Value!.Id, Word("take part", "noun"));

        var result = await service.UpdateWordAsync(userId, created.Value!.Id, new WordPatchRequest(Type: alias));

        Assert.True(result.IsSuccess);
        Assert.Equal(canonicalType, result.Value!.Type);
    }

    [Fact]
    public async Task BoardPreferences_AreBoardWideAndOwnerScoped()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));

        var updated = await service.UpdateBoardPreferencesAsync(
            userId,
            board.Value!.Id,
            new UpdateBoardPreferencesRequest(
                ["context"],
                ["word", "meaning", "ipaPronunciation", "context", "type", "example", "synonyms", "antonyms"],
                new Dictionary<string, int> { ["word"] = 260, ["example"] = 360 }));
        var loaded = await service.GetBoardAsync(userId, board.Value.Id);
        var foreign = await service.GetBoardAsync(Guid.NewGuid(), board.Value.Id);

        Assert.True(updated.IsSuccess);
        Assert.Equal(["context"], updated.Value!.HiddenColumns);
        Assert.Equal(260, updated.Value.ColumnWidths["word"]);
        Assert.Equal(["context"], loaded.Value!.Preferences.HiddenColumns);
        Assert.False(foreign.IsSuccess);
    }

    [Fact]
    public async Task BoardPreferences_RejectInvalidHiddenColumns()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));

        var result = await service.UpdateBoardPreferencesAsync(
            userId,
            board.Value!.Id,
            new UpdateBoardPreferencesRequest(["word"], ["word"], new Dictionary<string, int>()));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    [Fact]
    public async Task UpdateWordPatch_ChangesOnlyProvidedFields()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var created = await service.CreateWordAsync(userId, page.Value!.Id, Word("mitigate", "verb"));

        var updated = await service.UpdateWordAsync(userId, created.Value!.Id, new WordPatchRequest(IpaPronunciation: "/mItIgeIt/"));

        Assert.Equal("/mItIgeIt/", updated.Value!.IpaPronunciation);
        Assert.Equal("reduce harm", updated.Value.Context);
        Assert.Equal("mitigate", updated.Value.Word);
    }

    [Fact]
    public async Task UpdateWordPatch_RejectsInvalidRequiredValue()
    {
        var repository = new FakeVocabularyRepository();
        var service = new VocabularyService(repository);
        var userId = Guid.NewGuid();
        var board = await service.CreateBoardAsync(userId, new CreateBoardRequest("IELTS", "en"));
        var page = await service.CreatePageAsync(userId, board.Value!.Id, new CreatePageRequest("Unit 1"));
        var created = await service.CreateWordAsync(userId, page.Value!.Id, Word("mitigate", "verb"));

        var result = await service.UpdateWordAsync(userId, created.Value!.Id, new WordPatchRequest(Word: ""));

        Assert.False(result.IsSuccess);
        Assert.Equal("VALIDATION_ERROR", ((VocabularyError)result.Error!).Code);
    }

    private static WordRequest Word(string word, string wordType)
    {
        return new WordRequest(word, "nghia tieng Viet", "/mItIgeIt/", wordType, "reduce harm", "Example sentence.", "reduce", "worsen");
    }

    private sealed class FakeVocabularyRepository : IVocabularyRepository
    {
        private readonly List<VocabBoard> _boards = [];
        private readonly List<VocabPage> _pages = [];
        public List<VocabWord> Words { get; } = [];
        public List<VocabBoardPreference> Preferences { get; } = [];
        public bool FailCommits { get; set; }

        public Task<IReadOnlyList<VocabBoard>> ListBoardsAsync(Guid userId, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<VocabBoard>>(_boards
                .Where(board => board.UserId == userId)
                .OrderByDescending(board => board.CreatedAt)
                .ThenByDescending(board => board.Id)
                .ToList());

        public Task<VocabBoard?> GetBoardAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
            => Task.FromResult(_boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt is null));

        public Task<VocabPage?> GetPageAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
            => Task.FromResult(_pages.FirstOrDefault(page => page.Id == pageId && page.DeletedAt is null));

        public Task<VocabWord?> GetWordAsync(Guid userId, Guid wordId, CancellationToken cancellationToken = default)
        {
            var ownedPageIds = _pages.Where(page => page.DeletedAt is null).Select(page => page.Id).ToHashSet();
            return Task.FromResult(Words.FirstOrDefault(word => word.Id == wordId && ownedPageIds.Contains(word.PageId) && word.DeletedAt is null));
        }

        public Task<VocabBoard?> GetTrashedBoardAsync(Guid userId, Guid boardId, DateTime trashedAt, CancellationToken cancellationToken = default) =>
            Task.FromResult(_boards.FirstOrDefault(board => board.UserId == userId && board.Id == boardId && board.DeletedAt == trashedAt));

        public Task<VocabPage?> GetTrashedPageAsync(Guid userId, Guid pageId, DateTime trashedAt, CancellationToken cancellationToken = default)
        {
            var activeBoards = _boards.Where(board => board.UserId == userId && board.DeletedAt is null).Select(board => board.Id).ToHashSet();
            return Task.FromResult(_pages.FirstOrDefault(page => page.Id == pageId && page.DeletedAt == trashedAt && activeBoards.Contains(page.BoardId)));
        }

        public Task<VocabWord?> GetTrashedWordAsync(Guid userId, Guid wordId, DateTime trashedAt, CancellationToken cancellationToken = default)
        {
            var activePageIds = _pages.Where(page => page.DeletedAt is null).Select(page => page.Id).ToHashSet();
            return Task.FromResult(Words.FirstOrDefault(word => word.Id == wordId && word.DeletedAt == trashedAt && activePageIds.Contains(word.PageId)));
        }

        public Task<VocabBoardPreference?> GetBoardPreferenceAsync(Guid userId, Guid boardId, CancellationToken cancellationToken = default)
            => Task.FromResult(Preferences.FirstOrDefault(preference => preference.UserId == userId && preference.BoardId == boardId && preference.DeletedAt is null));

        public Task<IReadOnlyList<VocabWord>> ListWordsAsync(Guid userId, Guid pageId, CancellationToken cancellationToken = default)
            => Task.FromResult<IReadOnlyList<VocabWord>>(Words.Where(word => word.PageId == pageId && word.DeletedAt is null).ToList());

        public Task<IReadOnlyList<VocabWord>> ListTrashedWordsAsync(IReadOnlyCollection<Guid> pageIds, DateTime trashedAt, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<VocabWord>>(Words.Where(word => pageIds.Contains(word.PageId) && word.DeletedAt == trashedAt).ToList());

        public Task<IReadOnlyList<VocabWord>> ListWordsForPagesAsync(IReadOnlyCollection<Guid> pageIds, CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<VocabWord>>(Words.Where(word => pageIds.Contains(word.PageId)).ToList());

        public Task AddBoardAsync(VocabBoard board, CancellationToken cancellationToken = default)
        {
            _boards.Add(board);
            return Task.CompletedTask;
        }

        public Task AddPageAsync(VocabPage page, CancellationToken cancellationToken = default)
        {
            _pages.Add(page);
            return Task.CompletedTask;
        }

        public Task AddWordAsync(VocabWord word, CancellationToken cancellationToken = default)
        {
            Words.Add(word);
            return Task.CompletedTask;
        }

        public Task AddBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default)
        {
            Preferences.Add(preference);
            return Task.CompletedTask;
        }

        public Task UpdateBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdatePageAsync(VocabPage page, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateWordAsync(VocabWord word, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task UpdateBoardPreferenceAsync(VocabBoardPreference preference, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task SoftDeleteBoardAsync(VocabBoard board, DateTime trashedAt, CancellationToken cancellationToken = default)
        {
            board.SoftDelete(trashedAt);
            var pageIds = _pages.Where(page => page.BoardId == board.Id && page.DeletedAt is null).Select(page => page.Id).ToHashSet();
            foreach (var page in _pages.Where(page => pageIds.Contains(page.Id))) page.SoftDelete(trashedAt);
            foreach (var word in Words.Where(word => pageIds.Contains(word.PageId) && word.DeletedAt is null)) word.SoftDelete(trashedAt);
            return Task.CompletedTask;
        }

        public Task SoftDeletePageAsync(VocabPage page, DateTime trashedAt, CancellationToken cancellationToken = default)
        {
            page.SoftDelete(trashedAt);
            foreach (var word in Words.Where(word => word.PageId == page.Id && word.DeletedAt is null)) word.SoftDelete(trashedAt);
            return Task.CompletedTask;
        }

        public Task SoftDeleteWordAsync(VocabWord word, DateTime trashedAt, CancellationToken cancellationToken = default)
        {
            word.SoftDelete(trashedAt);
            return Task.CompletedTask;
        }

        public Task RemoveBoardAsync(VocabBoard board, CancellationToken cancellationToken = default) { _boards.Remove(board); _pages.RemoveAll(page => page.BoardId == board.Id); return Task.CompletedTask; }
        public Task RemovePageAsync(VocabPage page, CancellationToken cancellationToken = default) { _pages.Remove(page); Words.RemoveAll(word => word.PageId == page.Id); return Task.CompletedTask; }
        public Task RemoveWordAsync(VocabWord word, CancellationToken cancellationToken = default) { Words.Remove(word); return Task.CompletedTask; }

        public Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            if (FailCommits)
            {
                throw new InvalidOperationException("Simulated commit failure.");
            }

            return Task.CompletedTask;
        }
    }

    private sealed class RecordingVocabularyReviewCleanupPort : IVocabularyReviewCleanupPort
    {
        public List<Guid> RemovedWordIds { get; } = [];

        public Task RemoveWordProgressAsync(IEnumerable<Guid> wordIds, CancellationToken cancellationToken = default)
        {
            RemovedWordIds.AddRange(wordIds);
            return Task.CompletedTask;
        }
    }
}
