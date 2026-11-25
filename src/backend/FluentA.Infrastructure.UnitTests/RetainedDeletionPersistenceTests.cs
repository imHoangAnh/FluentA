using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.BoundedContexts.Journal;
using FluentA.Application.BoundedContexts.Note;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Vocabulary;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Domain.BoundedContexts.Note.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Project.Entities;
using FluentA.Domain.BoundedContexts.Project.Enums;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Domain.SeedWork;
using FluentA.Infrastructure.ContentProcessing.Journal;
using FluentA.Infrastructure.ContentProcessing.Note;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Assets;
using FluentA.Infrastructure.Persistence.Repositories.Journal;
using FluentA.Infrastructure.Persistence.Repositories.Note;
using FluentA.Infrastructure.Persistence.Repositories.Practice;
using FluentA.Infrastructure.Persistence.Repositories.Project;
using FluentA.Infrastructure.Persistence.Repositories.Review;
using FluentA.Infrastructure.Persistence.Repositories.Vocabulary;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class RetainedDeletionPersistenceTests
{
    [DeletionPostgresFact]
    public async Task FailedHistoryWriteRollsBackVocabularyAndHistoryTogether()
    {
        await using var database = await DeletionDatabase.CreateAsync();
        var user = User.CreateWithPassword($"rollback-{Guid.NewGuid():N}@example.test", "Owner", "hash");
        var board = VocabBoard.Create(user.Id, "Board", "en");
        var page = VocabPage.Create(board.Id, "Page");
        var word = Word(page.Id, "alpha");
        await using (var seed = database.CreateContext())
        {
            seed.AddRange(user, board, page, word);
            SeedHistory(seed, user.Id, board, page, word);
            await seed.SaveChangesAsync();
            await seed.Database.ExecuteSqlRawAsync("""
                CREATE FUNCTION reject_history_update() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN RAISE EXCEPTION 'Intentional deletion rollback proof'; END $$;
                CREATE TRIGGER reject_history_update BEFORE UPDATE ON review_sessions
                FOR EACH ROW EXECUTE FUNCTION reject_history_update();
                """);
        }
        await using (var deleting = database.CreateContext())
        {
            var service = new VocabularyService(new VocabularyRepository(deleting));
            await Assert.ThrowsAsync<DbUpdateException>(() => service.DeleteBoardAsync(user.Id, board.Id));
        }
        await using var verify = database.CreateContext();
        Assert.Null((await verify.Boards.SingleAsync()).DeletedAt);
        Assert.Null((await verify.Pages.SingleAsync()).DeletedAt);
        Assert.Null((await verify.Words.SingleAsync()).DeletedAt);
        Assert.Null((await verify.PracticeSessions.SingleAsync()).DeletedAt);
        Assert.Null((await verify.ReviewSessions.SingleAsync()).DeletedAt);
        Assert.Null((await verify.WordReviewStates.SingleAsync()).DeletedAt);
        Assert.Null((await verify.WordReviewHistories.SingleAsync()).DeletedAt);
    }

    [DeletionPostgresTheory]
    [InlineData("Board")]
    [InlineData("Page")]
    [InlineData("Word")]
    public async Task VocabularyDeleteRetainsRowsAndHidesOnlyRelatedHistory(string scope)
    {
        await using var database = await DeletionDatabase.CreateAsync();
        await using var seed = database.CreateContext();
        var user = User.CreateWithPassword($"delete-{Guid.NewGuid():N}@example.test", "Owner", "hash");
        var board = VocabBoard.Create(user.Id, "Affected", "en");
        var page = VocabPage.Create(board.Id, "Affected page");
        var word = Word(page.Id, "alpha");
        var otherWord = Word(page.Id, "beta");
        var otherBoard = VocabBoard.Create(user.Id, "Unrelated", "en");
        var otherPage = VocabPage.Create(otherBoard.Id, "Other page");
        var unrelatedWord = Word(otherPage.Id, "gamma");
        seed.AddRange(user, board, page, word, otherWord, otherBoard, otherPage, unrelatedWord);
        var affected = SeedHistory(seed, user.Id, board, page, word);
        var samePage = SeedHistory(seed, user.Id, board, page, otherWord);
        var unrelated = SeedHistory(seed, user.Id, otherBoard, otherPage, unrelatedWord);
        await seed.SaveChangesAsync();
        var idsBefore = seed.ChangeTracker.Entries<BaseEntity>().Select(entry => entry.Entity.Id).ToHashSet();

        await using (var deleting = database.CreateContext())
        {
            var service = new VocabularyService(new VocabularyRepository(deleting));
            var id = scope == "Board" ? board.Id : scope == "Page" ? page.Id : word.Id;
            async Task<FluentA.Application.Common.OperationResult<bool>> Delete(Guid owner) => scope switch
            {
                "Board" => await service.DeleteBoardAsync(owner, id),
                "Page" => await service.DeletePageAsync(owner, id),
                _ => await service.DeleteWordAsync(owner, id)
            };
            Assert.False((await Delete(Guid.NewGuid())).IsSuccess);
            Assert.True((await Delete(user.Id)).Value);
            Assert.False((await Delete(user.Id)).IsSuccess);
        }

        await using var verify = database.CreateContext();
        Assert.NotNull((await verify.Words.SingleAsync(item => item.Id == word.Id)).DeletedAt);
        Assert.Equal(scope == "Board", (await verify.Boards.SingleAsync(item => item.Id == board.Id)).DeletedAt != null);
        Assert.Equal(scope != "Word", (await verify.Pages.SingleAsync(item => item.Id == page.Id)).DeletedAt != null);
        await AssertHistoryAsync(verify, affected, hidden: true);
        await AssertHistoryAsync(verify, samePage, hidden: scope != "Word");
        await AssertHistoryAsync(verify, unrelated, hidden: false);
        // Read every participating table and prove identical IDs before and after.
        var rows = new List<BaseEntity>();
        rows.AddRange(await verify.Users.ToListAsync());
        rows.AddRange(await verify.Boards.ToListAsync());
        rows.AddRange(await verify.Pages.ToListAsync());
        rows.AddRange(await verify.Words.ToListAsync());
        rows.AddRange(await verify.PracticeSessions.ToListAsync());
        rows.AddRange(await verify.PracticeSessionItems.ToListAsync());
        rows.AddRange(await verify.PracticeAttempts.ToListAsync());
        rows.AddRange(await verify.PracticeSessionSummaries.ToListAsync());
        rows.AddRange(await verify.ReviewSessions.ToListAsync());
        rows.AddRange(await verify.ReviewSessionItems.ToListAsync());
        rows.AddRange(await verify.ReviewAttempts.ToListAsync());
        rows.AddRange(await verify.WordReviewStates.ToListAsync());
        rows.AddRange(await verify.WordReviewHistories.ToListAsync());
        Assert.True(idsBefore.SetEquals(rows.Select(row => row.Id)));
        Assert.All(rows.Where(row => row.DeletedAt != null), row => Assert.Equal(row.DeletedAt, row.UpdatedAt));
        Assert.DoesNotContain(verify.Model.GetEntityTypes(), type => type.GetTableName() == "trash_entries");
    }

    [DeletionPostgresFact]
    public async Task NotesJournalAndProjectDeleteRetainChildrenAndImageMetadata()
    {
        await using var database = await DeletionDatabase.CreateAsync();
        Guid owner;
        Guid noteId;
        Guid pageId;
        Guid assetId;
        Guid projectId;
        Guid journalId;
        await using (var seed = database.CreateContext())
        {
            var user = User.CreateWithPassword($"personal-{Guid.NewGuid():N}@example.test", "Owner", "hash");
            var note = NoteBoard.Create(user.Id, "Notes");
            var page = note.AddPage("Page", "<p>Preserved content</p>", DateTime.UtcNow);
            var asset = Asset.CreatePending(Guid.NewGuid(), user.Id, AssetType.NoteImage,
                $"note-images/{Guid.NewGuid():N}.png", "image/png", 128, DateTime.UtcNow.AddHours(1));
            asset.FinalizeUpload("image/png", 128);
            var project = ProjectBoard.Create(user.Id, "Project");
            var card = ProjectCard.Create(project.Columns.First().Id, "Goal", "Keep", CardPriority.Medium, null, 0);
            var journal = JournalEntry.Create(user.Id, "Journal", DateTime.UtcNow.Date, "<p>Keep</p>");
            seed.AddRange(user, note, asset, NotePageAsset.Create(page.Id, asset.Id), project, card, journal);
            await seed.SaveChangesAsync();
            (owner, noteId, pageId, assetId, projectId, journalId) = (user.Id, note.Id, page.Id, asset.Id, project.Id, journal.Id);
        }

        await using (var db = database.CreateContext())
        {
            var assets = new EfAssetRepository(db);
            var notes = new NoteService(new EfNoteRepository(db), new NoteContentProcessor(assets), assets, new UnusedStorage());
            var journals = new JournalService(new EfJournalRepository(db), new JournalContentProcessor(assets), assets, new UnusedStorage());
            var projects = new ProjectService(new EfProjectRepository(db));
            Assert.False((await notes.DeleteBoardAsync(Guid.NewGuid(), noteId)).IsSuccess);
            Assert.False((await journals.DeleteAsync(Guid.NewGuid(), journalId)).IsSuccess);
            Assert.False((await projects.DeleteBoardAsync(Guid.NewGuid(), projectId)).IsSuccess);
            Assert.True((await notes.DeleteBoardAsync(owner, noteId)).Value);
            Assert.True((await journals.DeleteAsync(owner, journalId)).Value);
            Assert.True((await projects.DeleteBoardAsync(owner, projectId)).Value);
            Assert.Empty((await notes.ListBoardsAsync(owner)).Value!);
            Assert.Null((await notes.GetPageAsync(owner, pageId)).Value);
            Assert.Empty((await journals.ListAsync(owner)).Value!);
            Assert.Empty((await projects.ListBoardsAsync(owner)).Value!);
            Assert.False((await notes.DeleteBoardAsync(owner, noteId)).IsSuccess);
            Assert.False((await journals.DeleteAsync(owner, journalId)).IsSuccess);
            Assert.False((await projects.DeleteBoardAsync(owner, projectId)).IsSuccess);
        }
        await using var verify = database.CreateContext();
        Assert.NotNull((await verify.NoteBoards.SingleAsync()).DeletedAt);
        Assert.NotNull((await verify.NotePages.SingleAsync()).DeletedAt);
        var retainedAsset = await verify.Assets.SingleAsync(item => item.Id == assetId);
        Assert.Equal(AssetStatus.Ready, retainedAsset.Status);
        Assert.Null(retainedAsset.DeletedAt);
        Assert.Equal(128, retainedAsset.SizeBytes);
        Assert.Null((await verify.NotePageAssets.SingleAsync()).DeletedAt);
        Assert.NotNull((await verify.JournalEntries.SingleAsync()).DeletedAt);
        Assert.NotNull((await verify.ProjectBoards.SingleAsync()).DeletedAt);
        Assert.Equal(3, await verify.ProjectColumns.CountAsync());
        Assert.All(await verify.ProjectColumns.ToListAsync(), column => Assert.NotNull(column.DeletedAt));
        Assert.NotNull((await verify.ProjectCards.SingleAsync()).DeletedAt);
    }

    private static VocabWord Word(Guid pageId, string text) => VocabWord.Create(pageId, text, "meaning", "/word/", WordType.Noun, null, "Example.");

    private sealed record History(Guid UserId, Guid PracticeId, Guid ReviewId, Guid WordId);

    private static History SeedHistory(AppDbContext db, Guid userId, VocabBoard board, VocabPage page, VocabWord word)
    {
        var now = DateTime.UtcNow;
        var practice = PracticeSession.Create(userId, page.Id, page.Name, board.Id, board.Name, board.Language, now);
        var item = PracticeSessionItem.Create(practice.Id, word.Id, 0, word.Word, word.Meaning, word.IpaPronunciation,
            "noun", null, word.Example, null, null, ["meaning", "other", "third", "fourth"], 0, false);
        item.MarkAnswer(true, PracticeStep.Dictation, now);
        item.MarkAnswer(true, PracticeStep.WordToMeaning, now);
        item.RecordPronunciation(true, now);
        item.SetReviewEnrollment(1, false, now);
        practice.AdvanceFrom(0, now);
        practice.Complete(1, now);
        var attempt = PracticeAttempt.Create(practice.Id, item.Id, PracticeStep.Dictation, PracticeAttemptKind.Answer,
            word.Word, null, true, 100, null, null, null, null, now);
        var summary = PracticeSessionSummary.Create(userId, page.Id, page.Name, PracticeMode.FixedSequence, 1, 1, 0, now);
        var review = ReviewSession.CreateActive(userId, DateOnly.FromDateTime(now), now);
        var reviewItem = ReviewSessionItem.Create(review.Id, word.Id, 0, "dictation", "en", word.Word, word.Meaning,
            word.IpaPronunciation, "noun", null, word.Example, null, null);
        var due = DateOnly.FromDateTime(now);
        reviewItem.Complete(FluentAsrsReviewResult.Correct, 0, 1, due, due.AddDays(1), now);
        review.Complete(now);
        var state = WordReviewState.CreateAtLevel(userId, word.Id, 1, due.AddDays(1));
        var history = WordReviewHistory.Create(userId, word.Id, review.Id, reviewItem.Id, 1, now, FluentAsrsReviewResult.Correct);
        db.AddRange(practice, item, attempt, summary, review, reviewItem, state, history,
            ReviewAttempt.CreateTyped(reviewItem.Id, "dictation", word.Word, true, 1, now));
        return new(userId, practice.Id, review.Id, word.Id);
    }

    private static async Task AssertHistoryAsync(AppDbContext db, History history, bool hidden)
    {
        Assert.Equal(hidden, (await db.PracticeSessions.SingleAsync(item => item.Id == history.PracticeId)).DeletedAt != null);
        Assert.Equal(hidden, (await db.ReviewSessions.SingleAsync(item => item.Id == history.ReviewId)).DeletedAt != null);
        Assert.All(await db.PracticeSessionItems.Where(item => item.PracticeSessionId == history.PracticeId).ToListAsync(), item => Assert.Equal(hidden, item.DeletedAt != null));
        Assert.All(await db.PracticeAttempts.Where(item => item.PracticeSessionId == history.PracticeId).ToListAsync(), item => Assert.Equal(hidden, item.DeletedAt != null));
        var items = await db.ReviewSessionItems.Where(item => item.ReviewSessionId == history.ReviewId).ToListAsync();
        Assert.All(items, item => Assert.Equal(hidden, item.DeletedAt != null));
        var ids = items.Select(item => item.Id).ToArray();
        Assert.All(await db.ReviewAttempts.Where(item => ids.Contains(item.ReviewSessionItemId)).ToListAsync(), item => Assert.Equal(hidden, item.DeletedAt != null));
        Assert.All(await db.WordReviewHistories.Where(item => item.SessionId == history.ReviewId).ToListAsync(), item => Assert.Equal(hidden, item.DeletedAt != null));
        Assert.Equal(hidden, (await db.WordReviewStates.SingleAsync(item => item.WordId == history.WordId)).DeletedAt != null);
        Assert.Equal(!hidden, (await new EfPracticeRepository(db).GetSessionAsync(history.UserId, history.PracticeId)).Value != null);
        Assert.Equal(!hidden, await new EfReviewRepository(db).GetSessionAsync(history.UserId, history.ReviewId) != null);
    }

    private sealed class UnusedStorage : IAssetObjectStorage
    {
        public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request) => throw new NotSupportedException();
        public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request) => throw new NotSupportedException();
        public Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default) => throw new NotSupportedException();
        public Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default) => throw new NotSupportedException();
    }
    private sealed class DeletionPostgresTheoryAttribute : TheoryAttribute
    {
        public DeletionPostgresTheoryAttribute() { if (string.IsNullOrWhiteSpace(DeletionDatabase.RawConnectionString)) Skip = "Set FLUENTA_DELETION_VALIDATION_POSTGRES for isolated PostgreSQL proof."; }
    }
    private sealed class DeletionPostgresFactAttribute : FactAttribute
    {
        public DeletionPostgresFactAttribute() { if (string.IsNullOrWhiteSpace(DeletionDatabase.RawConnectionString)) Skip = "Set FLUENTA_DELETION_VALIDATION_POSTGRES for isolated PostgreSQL proof."; }
    }

    private sealed class DeletionDatabase(string adminConnectionString, string connectionString, string schema) : IAsyncDisposable
    {
        public static string? RawConnectionString => Environment.GetEnvironmentVariable("FLUENTA_DELETION_VALIDATION_POSTGRES");
        public AppDbContext CreateContext() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(connectionString).Options);
        public static async Task<DeletionDatabase> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(RawConnectionString);
            if (builder.Database != "fluenta_deletion_validation" || builder.Port != 15442 || builder.Host != "127.0.0.1")
                throw new InvalidOperationException("Deletion proof requires isolated fluenta_deletion_validation on 127.0.0.1:15442.");
            var schema = $"deletion_test_{Guid.NewGuid():N}";
            await using var connection = new NpgsqlConnection(builder.ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"CREATE SCHEMA \"{schema}\"";
            await command.ExecuteNonQueryAsync();
            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString) { SearchPath = schema };
            var database = new DeletionDatabase(builder.ConnectionString, scoped.ConnectionString, schema);
            try { await using var db = database.CreateContext(); await db.Database.MigrateAsync(); return database; }
            catch { await database.DisposeAsync(); throw; }
        }
        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(adminConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"DROP SCHEMA IF EXISTS \"{schema}\" CASCADE";
            await command.ExecuteNonQueryAsync();
        }
    }
}
