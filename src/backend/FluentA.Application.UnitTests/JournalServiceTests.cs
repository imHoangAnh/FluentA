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
        var service = new JournalService(repository);
        var userId = Guid.NewGuid();

        var first = await service.CreateAsync(userId, new CreateJournalEntryRequest("First", "Xin chào", "2026-06-10"));
        var second = await service.CreateAsync(userId, new CreateJournalEntryRequest("Second", "Hello", null));
        var listed = await service.ListAsync(userId);
        var fetched = await service.GetAsync(userId, first.Value!.Id);
        var updated = await service.UpdateAsync(userId, first.Value.Id, new UpdateJournalEntryRequest("Updated", "Nội dung mới", ""));
        var deleted = await service.DeleteAsync(userId, second.Value!.Id);
        var afterDelete = await service.ListAsync(userId);

        Assert.True(first.IsSuccess);
        Assert.Equal(["Second", "First"], listed.Value!.Select(entry => entry.Title));
        Assert.Equal("Xin chào", fetched.Value!.Content);
        Assert.Equal("Updated", updated.Value!.Title);
        Assert.Null(updated.Value.LearningDate);
        Assert.True(deleted.Value);
        Assert.Single(afterDelete.Value!);
    }

    [Fact]
    public async Task ForeignMissingAndDeletedEntries_ReturnJournalNotFound()
    {
        var repository = new FakeJournalRepository();
        var service = new JournalService(repository);
        var ownerId = Guid.NewGuid();
        var entry = await service.CreateAsync(ownerId, new CreateJournalEntryRequest("Private"));

        var foreign = await service.GetAsync(Guid.NewGuid(), entry.Value!.Id);
        await service.DeleteAsync(ownerId, entry.Value.Id);
        var deleted = await service.GetAsync(ownerId, entry.Value.Id);

        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)foreign.Error!).Code);
        Assert.Equal("JOURNAL_NOT_FOUND", ((JournalError)deleted.Error!).Code);
    }

    [Fact]
    public async Task CreateAndUpdate_RejectInvalidFields()
    {
        var service = new JournalService(new FakeJournalRepository());
        var userId = Guid.NewGuid();

        var invalidCreate = await service.CreateAsync(userId, new CreateJournalEntryRequest(" ", LearningDate: "June 11"));
        var entry = await service.CreateAsync(userId, new CreateJournalEntryRequest("Valid"));
        var invalidUpdate = await service.UpdateAsync(userId, entry.Value!.Id, new UpdateJournalEntryRequest(Content: new string('a', 100_001)));

        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidCreate.Error!).Code);
        Assert.Equal("VALIDATION_ERROR", ((JournalError)invalidUpdate.Error!).Code);
    }

    private sealed class FakeJournalRepository : IJournalRepository
    {
        private readonly List<JournalEntry> _entries = [];

        public Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult<IReadOnlyList<JournalEntryListItem>>(_entries
                .Where(entry => entry.UserId == userId && entry.DeletedAt is null)
                .OrderByDescending(entry => entry.CreatedAt)
                .ThenByDescending(entry => entry.Id)
                .Select(entry => new JournalEntryListItem(
                    entry.Id,
                    entry.Title,
                    entry.Preview,
                    entry.LearningDate,
                    entry.CreatedAt,
                    entry.UpdatedAt))
                .ToList());
        }

        public Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(_entries.FirstOrDefault(entry =>
                entry.Id == journalId && entry.UserId == userId && entry.DeletedAt is null));
        }

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
}
