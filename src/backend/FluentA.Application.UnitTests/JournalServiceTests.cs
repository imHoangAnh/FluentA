using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Domain.BoundedContexts.Journal.Entities;

namespace FluentA.Application.UnitTests;

public sealed class JournalServiceTests
{
    [Fact]
    public async Task CreateListGetUpdateDelete_UsesOwnedEntriesNewestFirst()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var userId = Guid.NewGuid();

        var first = await service.CreateAsync(userId, new CreateJournalEntryRequest("First", "2026-06-10", "Xin chao"));
        var second = await service.CreateAsync(userId, new CreateJournalEntryRequest("Second", "2026-06-11", "Hello"));
        var listed = await service.ListAsync(userId);
        var fetched = await service.GetAsync(userId, first.Value!.Id);
        var updated = await service.UpdateAsync(userId, first.Value.Id, new UpdateJournalEntryRequest("Updated", "Noi dung moi", "2026-06-12"));
        var deleted = await service.DeleteAsync(userId, second.Value!.Id);
        var afterDelete = await service.ListAsync(userId);

        Assert.True(first.IsSuccess);
        Assert.Equal(["Second", "First"], listed.Value!.Select(entry => entry.Title));
        Assert.Equal("<p>Xin chao</p>", fetched.Value!.Content);
        Assert.Equal("Updated", updated.Value!.Title);
        Assert.Equal("2026-06-12", updated.Value.Date);
        Assert.True(deleted.Value);
        Assert.Single(afterDelete.Value!);
    }

    [Fact]
    public async Task ForeignMissingAndDeletedEntries_ReturnJournalNotFound()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var ownerId = Guid.NewGuid();
        var entry = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Private", "2026-06-10"));

        var foreign = await service.GetAsync(Guid.NewGuid(), entry.Value!.Id);
        await service.DeleteAsync(ownerId, entry.Value.Id);
        var deleted = await service.GetAsync(ownerId, entry.Value.Id);

        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)foreign.Error!).Code);
        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)deleted.Error!).Code);
    }

    [Fact]
    public async Task CreateAndUpdate_RejectInvalidFields()
    {
        var service = new JournalService(new FakeJournalRepository(), new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var userId = Guid.NewGuid();

        var invalidCreate = await service.CreateAsync(userId, new CreateJournalEntryRequest(" ", "June-11"));
        var entry = await service.CreateAsync(userId, new CreateJournalEntryRequest("Valid", "2026-06-11"));
        var invalidUpdate = await service.UpdateAsync(userId, entry.Value!.Id, new UpdateJournalEntryRequest(Content: new string('a', 100_001)));

        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidCreate.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidUpdate.Error!).Code);
    }

    [Fact]
    public async Task FormattingBeyondContentLimit_ReturnsValidationWithoutChangingEntry()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var userId = Guid.NewGuid();
        // The processor adds paragraph markup, taking this valid raw input above the stored limit.
        var nearLimit = new string('a', 99_999);

        var rejectedCreate = await service.CreateAsync(userId, new("Too long after processing", "2026-10-08", nearLimit));
        Assert.Equal("VALIDATION_ERROR", rejectedCreate.Error!.Code);
        Assert.Empty((await service.ListAsync(userId)).Value!);

        var created = await service.CreateAsync(userId, new("Original", "2026-10-08", "Original content"));
        var rejectedUpdate = await service.UpdateAsync(userId, created.Value!.Id, new(Title: "Changed", Content: nearLimit));

        Assert.Equal("VALIDATION_ERROR", rejectedUpdate.Error!.Code);
        var unchanged = (await service.GetAsync(userId, created.Value.Id)).Value!;
        Assert.Equal("Original", unchanged.Title);
        Assert.Equal("<p>Original content</p>", unchanged.Content);
    }

    [Fact]
    public async Task Search_ValidatesQueryAndBuildsTitleHighlightRanges()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var userId = Guid.NewGuid();
        await service.CreateAsync(userId, new CreateJournalEntryRequest(
            "Vietnamese practice",
            "2026-06-10",
            "Body text does not participate in search"));

        var result = await service.SearchAsync(userId, "practice");
        var invalid = await service.SearchAsync(userId, " ");

        Assert.True(result.IsSuccess);
        var match = Assert.Single(result.Value!);
        Assert.Equal("Vietnamese practice", match.Title);
        Assert.Single(match.Highlights);
        Assert.Equal("practice", match.Title.Substring(match.Highlights[0].Start, match.Highlights[0].Length), ignoreCase: true);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalid.Error!).Code);
    }

    [Fact]
    public async Task Calendar_GroupsOwnedActiveDatesAndValidatesMonth()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var ownerId = Guid.NewGuid();
        var foreignId = Guid.NewGuid();
        var first = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("First", "2026-06-12", "One"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Second", "2026-06-12", "Two"));
        await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Other month", "2026-07-01", "Three"));
        await service.CreateAsync(foreignId, new CreateJournalEntryRequest("Foreign", "2026-06-12", "Four"));
        var deleted = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Deleted", "2026-06-13", "Five"));
        await service.DeleteAsync(ownerId, deleted.Value!.Id);

        var calendar = await service.CalendarAsync(ownerId, "2026-06");
        var invalid = await service.CalendarAsync(ownerId, "June 2026");

        var day = Assert.Single(calendar.Value!);
        Assert.Equal("2026-06-12", day.Date);
        Assert.Equal(1, day.Count);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalid.Error!).Code);
        Assert.True(first.IsSuccess);
    }

    [Fact]
    public async Task OneActiveJournalPerDate_RejectsDuplicatesAndDateMoves_ButAllowsRecreationAfterDelete()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var owner = Guid.NewGuid();
        var entry = await service.CreateAsync(owner, new("One", "2026-10-08"));
        var duplicate = await service.CreateAsync(owner, new("Two", "2026-10-08"));
        Assert.Equal("JOURNAL_DATE_CONFLICT", duplicate.Error!.Code);
        Assert.Equal(409, duplicate.Error.StatusCode);
        var second = await service.CreateAsync(owner, new("Next", "2026-10-09"));
        Assert.Equal("JOURNAL_DATE_CONFLICT", (await service.UpdateAsync(owner, second.Value!.Id, new(Date: "2026-10-08"))).Error!.Code);
        Assert.True((await service.CreateAsync(Guid.NewGuid(), new("Other owner", "2026-10-08"))).IsSuccess);
        await service.DeleteAsync(owner, entry.Value!.Id);
        Assert.True((await service.CreateAsync(owner, new("Replacement", "2026-10-08"))).IsSuccess);
    }

    [Fact]
    public async Task MoodStarredTagsPreviewAndVocabSuggestions_WorkEndToEnd()
    {
        var repository = new FakeJournalRepository();
        repository.SeedVocab(new JournalVocabSuggestionItem(Guid.NewGuid(), "resilient", "able to recover quickly", "Adjective"));
        var service = new JournalService(repository, new FakeJournalContentProcessor(), new TestAssetRepository(), new TestAssetStorage());
        var owner = Guid.NewGuid();

        var created = await service.CreateAsync(
            owner,
            new CreateJournalEntryRequest(
                "Slow afternoon tea",
                "2026-11-23",
                "Calm rest after work",
                "Peaceful",
                true,
                ["#Reflection", "English"]));

        Assert.True(created.IsSuccess);
        Assert.Equal("peaceful", created.Value!.Mood);
        Assert.True(created.Value.IsStarred);
        Assert.Equal(["reflection", "english"], created.Value.Tags);

        var summary = Assert.Single((await service.ListAsync(owner)).Value!);
        Assert.Equal("peaceful", summary.Mood);
        Assert.True(summary.IsStarred);
        Assert.Equal(["reflection", "english"], summary.Tags);
        Assert.Equal("Calm rest after work", summary.Preview);

        var tagSearch = await service.SearchAsync(owner, "#english");
        Assert.Single(tagSearch.Value!);

        var updated = await service.UpdateAsync(
            owner,
            created.Value.Id,
            new UpdateJournalEntryRequest(Mood: "", IsStarred: false, Tags: ["grateful"]));
        Assert.True(updated.IsSuccess);
        Assert.Null(updated.Value!.Mood);
        Assert.False(updated.Value.IsStarred);
        Assert.Equal(["grateful"], updated.Value.Tags);

        var invalidMood = await service.UpdateAsync(owner, created.Value.Id, new UpdateJournalEntryRequest(Mood: "invalid"));
        Assert.Equal("VALIDATION_ERROR", invalidMood.Error!.Code);

        var vocab = await service.GetVocabSuggestionsAsync(owner, 5);
        Assert.True(vocab.IsSuccess);
        var suggestion = Assert.Single(vocab.Value!);
        Assert.Equal("resilient", suggestion.Word);
    }

    private sealed class FakeJournalRepository : IJournalRepository
    {
        private readonly List<JournalEntry> _entries = [];
        private readonly List<JournalVocabSuggestionItem> _vocab = [];

        public void SeedVocab(JournalVocabSuggestionItem item) => _vocab.Add(item);

        public Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalEntryListItem>>(_entries
                .Where(entry => entry.UserId == userId && entry.DeletedAt is null)
                .OrderByDescending(entry => entry.Date)
                .ThenByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Select(entry => new JournalEntryListItem(
                    entry.Id,
                    entry.Title,
                    entry.Date,
                    entry.CreatedAt,
                    entry.UpdatedAt,
                    entry.Mood,
                    entry.IsStarred,
                    entry.Tags,
                    entry.Content))
                .ToList());
        }

        public Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_entries.FirstOrDefault(entry =>
                entry.Id == journalId && entry.UserId == userId && entry.DeletedAt is null));
        }

        public Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(Guid userId, string query, CancellationToken cancellationToken = default)
        {
            var tagQuery = query.Trim().TrimStart('#');
            return Task.FromResult<IReadOnlyList<JournalEntrySearchItem>>(_entries
                .Where(entry =>
                    entry.UserId == userId &&
                    entry.DeletedAt is null &&
                    (entry.Title.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                     entry.Content.Contains(query, StringComparison.OrdinalIgnoreCase) ||
                     entry.Tags.Any(tag => tag.Contains(tagQuery, StringComparison.OrdinalIgnoreCase))))
                .OrderByDescending(entry => entry.Date)
                .ThenByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Take(50)
                .Select(entry => new JournalEntrySearchItem(
                    entry.Id,
                    entry.Title,
                    entry.Date,
                    entry.CreatedAt,
                    entry.UpdatedAt,
                    entry.Mood,
                    entry.IsStarred,
                    entry.Tags,
                    entry.Content))
                .ToList());
        }

        public Task<IReadOnlyList<JournalCalendarDayItem>> CalendarAsync(
            Guid userId,
            DateTime monthStart,
            DateTime monthEnd,
            CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalCalendarDayItem>>(_entries
                .Where(entry =>
                    entry.UserId == userId &&
                    entry.DeletedAt is null &&
                    entry.Date >= monthStart &&
                    entry.Date < monthEnd)
                .GroupBy(entry => entry.Date)
                .OrderBy(group => group.Key)
                .Select(group => new JournalCalendarDayItem(group.Key, group.Count(), group.Select(entry => entry.Mood).FirstOrDefault()))
                .ToList());
        }

        public Task<IReadOnlyList<JournalVocabSuggestionItem>> ListVocabSuggestionsAsync(
            Guid userId,
            int count,
            CancellationToken cancellationToken = default) =>
            Task.FromResult<IReadOnlyList<JournalVocabSuggestionItem>>(_vocab.Take(count).ToList());

        public Task<bool> DateExistsAsync(Guid userId, DateTime date, Guid? excludingId = null, CancellationToken cancellationToken = default) =>
            Task.FromResult(_entries.Any(entry => entry.UserId == userId && entry.Date == date && entry.Id != excludingId && entry.DeletedAt is null));
        public Task<IReadOnlySet<Guid>> GetEntryAssetIdsAsync(Guid entryId, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlySet<Guid>>(new HashSet<Guid>());
        public Task<IReadOnlyDictionary<Guid, Guid>> GetAttachedAssetEntryIdsAsync(IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default) => Task.FromResult<IReadOnlyDictionary<Guid, Guid>>(new Dictionary<Guid, Guid>());
        public Task ReplaceEntryAssetLinksAsync(Guid entryId, IReadOnlySet<Guid> assetIds, CancellationToken cancellationToken = default) => Task.CompletedTask;
        public Task<bool> SaveChangesAsync(CancellationToken cancellationToken = default) => Task.FromResult(true);

        public Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default)
        {
            _entries.Add(entry);
            return Task.CompletedTask;
        }

        public Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default)
        {
            return Task.CompletedTask;
        }

    }

    private sealed class FakeJournalContentProcessor : IJournalContentProcessor
    {
        public Task<JournalProcessedContent> ProcessAsync(Guid userId, string? content, CancellationToken cancellationToken = default)
        {
            var text = content ?? string.Empty;
            return Task.FromResult(new JournalProcessedContent(string.IsNullOrEmpty(text) ? string.Empty : $"<p>{text}</p>", new HashSet<Guid>()));
        }
        public IReadOnlySet<Guid> ExtractReferencedAssetIds(string? content) => new HashSet<Guid>();
        public string HydrateImageSources(string? content, IReadOnlyDictionary<Guid, string> assetUrls) => content ?? "";
    }
}
