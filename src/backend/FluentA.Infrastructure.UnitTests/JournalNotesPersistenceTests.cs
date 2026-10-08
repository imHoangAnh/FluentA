using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Journal.DTOs;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Infrastructure.ContentProcessing.Journal;
using FluentA.Infrastructure.ContentProcessing.Note;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Journal;
using FluentA.Infrastructure.Persistence.Repositories.Note;
using FluentA.Infrastructure.Persistence.Repositories.Assets;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class JournalNotesPersistenceTests
{
    [JournalPostgresFact]
    public async Task ConcurrentCreates_CommitOneActiveJournal_AndDeleteAllowsReplacementWithoutLosingRows()
    {
        await using var database = await JournalDatabase.CreateAsync();
        var owner = User.CreateWithPassword($"journal-{Guid.NewGuid():N}@example.test", "Owner", "hash");
        await using (var seed = database.CreateContext()) { seed.Users.Add(owner); await seed.SaveChangesAsync(); }
        var date = DateTime.SpecifyKind(new DateTime(2026, 10, 8), DateTimeKind.Utc);
        await using var first = database.CreateContext();
        await using var second = database.CreateContext();
        var firstRepository = new EfJournalRepository(first);
        var secondRepository = new EfJournalRepository(second);
        Assert.False(await firstRepository.DateExistsAsync(owner.Id, date));
        Assert.False(await secondRepository.DateExistsAsync(owner.Id, date));
        await firstRepository.AddAsync(JournalEntry.Create(owner.Id, "One", date));
        await secondRepository.AddAsync(JournalEntry.Create(owner.Id, "Two", date));
        var results = await Task.WhenAll(firstRepository.SaveChangesAsync(), secondRepository.SaveChangesAsync());
        Assert.Single(results, result => result);
        Assert.Single(results, result => !result);
        await using var verify = database.CreateContext();
        var retained = await verify.JournalEntries.SingleAsync();
        retained.SoftDelete();
        await verify.SaveChangesAsync();
        verify.JournalEntries.Add(JournalEntry.Create(owner.Id, "Replacement", date));
        await verify.SaveChangesAsync();
        Assert.Equal(2, await verify.JournalEntries.CountAsync());
        Assert.Single(await new EfJournalRepository(verify).ListAsync(owner.Id));
        Assert.False(verify.Database.HasPendingModelChanges());
    }

    [JournalPostgresFact]
    public async Task BothEditors_RoundTripOwnedImages_AndSoftDeleteRetainsRowsAssetsAndLinks()
    {
        await using var database = await JournalDatabase.CreateAsync();
        var owner = User.CreateWithPassword($"image-{Guid.NewGuid():N}@example.test", "Owner", "hash");
        var journalImage = Ready(owner.Id, AssetType.JournalImage);
        var noteImage = Ready(owner.Id, AssetType.NoteImage);
        await using (var seed = database.CreateContext()) { seed.AddRange(owner, journalImage, noteImage); await seed.SaveChangesAsync(); }
        Guid journalId, pageId;
        await using (var db = database.CreateContext())
        {
            var assets = new EfAssetRepository(db);
            var storage = new DisabledAssetObjectStorage();
            var journals = new JournalService(new EfJournalRepository(db), new JournalContentProcessor(assets), assets, storage);
            var created = await journals.CreateAsync(owner.Id, new("Today", "2026-10-08", Html(journalImage.Id)));
            Assert.True(created.IsSuccess);
            journalId = created.Value!.Id;
            Assert.Contains("width=\"250\"", created.Value.Content);
            Assert.DoesNotContain("src=", (await db.JournalEntries.SingleAsync()).Content);
            Assert.Equal("JOURNAL_DATE_CONFLICT", (await journals.CreateAsync(owner.Id, new("Duplicate", "2026-10-08"))).Error!.Code);
            Assert.False((await journals.UpdateAsync(owner.Id, journalId, new(Content: Html(noteImage.Id)))).IsSuccess);
            Assert.False((await journals.UpdateAsync(Guid.NewGuid(), journalId, new(Content: Html(journalImage.Id)))).IsSuccess);
            var notes = new NoteService(new EfNoteRepository(db), new NoteContentProcessor(assets), assets, storage);
            var board = await notes.CreateBoardAsync(owner.Id, new("Notes"));
            var page = await notes.CreatePageAsync(owner.Id, board.Value!.Id, new("Page"));
            pageId = page.Value!.Id;
            var updated = await notes.UpdatePageAsync(owner.Id, pageId, new(Content: Html(noteImage.Id)));
            Assert.True(updated.IsSuccess);
            Assert.Contains("data-image-align=\"center\"", updated.Value!.Content);
            Assert.True((await journals.DeleteAsync(owner.Id, journalId)).Value);
            Assert.True((await notes.DeletePageAsync(owner.Id, pageId)).Value);
            Assert.False((await journals.GetAsync(owner.Id, journalId)).IsSuccess);
            Assert.False((await notes.GetPageAsync(owner.Id, pageId)).IsSuccess);
        }
        await using var retained = database.CreateContext();
        Assert.NotNull((await retained.JournalEntries.SingleAsync()).DeletedAt);
        Assert.NotNull((await retained.NotePages.SingleAsync()).DeletedAt);
        Assert.Equal(2, await retained.Assets.CountAsync());
        Assert.All(await retained.Assets.ToListAsync(), image => Assert.Null(image.DeletedAt));
        Assert.Single(await retained.JournalEntryAssets.ToListAsync());
        Assert.Single(await retained.NotePageAssets.ToListAsync());
    }

    private static string Html(Guid id) => $"<h6>Heading</h6><p style=\"text-align: center\"><span style=\"color: red\">Text</span></p><img data-asset-id=\"{id}\" src=\"https://temporary.test/img\" width=\"250\" height=\"125\" data-image-align=\"center\"><p>After</p>";
    private static Asset Ready(Guid owner, AssetType type)
    {
        var image = Asset.CreatePending(Guid.NewGuid(), owner, type, $"image-{Guid.NewGuid():N}.png", "image/png", 0, DateTime.UtcNow.AddHours(1));
        image.FinalizeUpload("image/png", 128);
        return image;
    }

    private sealed class JournalPostgresFactAttribute : FactAttribute
    {
        public JournalPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(JournalDatabase.RawConnectionString))
                Skip = "Set FLUENTA_JOURNAL_VALIDATION_POSTGRES to run the isolated PostgreSQL proof.";
        }
    }

    private sealed class JournalDatabase : IAsyncDisposable
    {
        private readonly string _adminConnectionString;
        private readonly string _schema;

        private JournalDatabase(string adminConnectionString, string scopedConnectionString, string schema)
        {
            _adminConnectionString = adminConnectionString;
            ConnectionString = scopedConnectionString;
            _schema = schema;
        }

        public static string? RawConnectionString => Environment.GetEnvironmentVariable("FLUENTA_JOURNAL_VALIDATION_POSTGRES");
        public string ConnectionString { get; }

        public static async Task<JournalDatabase> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(RawConnectionString);
            if (builder.Database != "fluenta_journal_validation" || builder.Port != 15442)
                throw new InvalidOperationException("Journal proof requires isolated fluenta_journal_validation on port 15442.");

            var schema = $"journal_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString) { SearchPath = schema };
            var database = new JournalDatabase(builder.ConnectionString, scoped.ConnectionString, schema);
            try
            {
                await using var context = database.CreateContext();
                await context.Database.MigrateAsync();
                return database;
            }
            catch
            {
                await database.DisposeAsync();
                throw;
            }
        }

        public AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString).Options);

        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(_adminConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"DROP SCHEMA IF EXISTS \"{_schema}\" CASCADE";
            await command.ExecuteNonQueryAsync();
        }
    }
}
