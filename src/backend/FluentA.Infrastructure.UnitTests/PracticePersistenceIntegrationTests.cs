using FluentA.Application.BoundedContexts.Practice;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Application.BoundedContexts.Review;
using FluentA.Application.Common;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Practice;
using FluentA.Infrastructure.Persistence.Repositories.Review;
using FluentA.Infrastructure.Persistence.Transactions;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

// Uses a dedicated database and a per-test schema; never accepts the app DB.
public sealed class PracticePersistenceIntegrationTests
{
    [LearningPostgresFact]
    public async Task Recap_SaveThenFailureRollsBackReviewAndProgress_AndRetryCommitsBoth()
    {
        await using var database = await Database.CreateAsync();
        var (userId, sessionId, itemId, wordId) = await database.SeedRecap();
        await using (var context = database.Context())
        {
            var transaction = new FailAfterSave(new EfPracticeTransaction(context));
            await Assert.ThrowsAsync<IOException>(() => Service(context, transaction).SetReviewLevelAsync(userId, sessionId, wordId, new(3, "UTC")));
        }
        await using (var verify = database.Context())
        {
            Assert.Empty(await verify.WordReviewStates.ToArrayAsync());
            Assert.False((await verify.PracticeSessionItems.SingleAsync()).IsCompleted);
            Assert.Equal(0, (await verify.PracticeSessions.SingleAsync()).CurrentItemIndex);
        }
        await using (var context = database.Context())
            Assert.True((await Service(context).SetReviewLevelAsync(userId, sessionId, wordId, new(3, "UTC"))).IsSuccess);
        DateOnly scheduled;
        await using (var verify = database.Context())
        {
            var state = await verify.WordReviewStates.SingleAsync();
            Assert.Equal(3, state.Level);
            scheduled = state.NextReviewDate;
            Assert.True((await verify.PracticeSessionItems.SingleAsync()).IsCompleted);
            Assert.Equal(1, (await verify.PracticeSessions.SingleAsync()).CurrentItemIndex);
        }
        await using (var context = database.Context())
            Assert.True((await Service(context).SetReviewLevelAsync(userId, sessionId, wordId, new(3, "UTC"))).IsSuccess);
        await using (var verify = database.Context())
        {
            Assert.Equal(scheduled, (await verify.WordReviewStates.SingleAsync()).NextReviewDate);
            Assert.Equal(1, (await verify.PracticeSessions.SingleAsync()).CurrentItemIndex);
        }
    }

    [LearningPostgresFact]
    public async Task ConcurrentAnswerReplayStoresOneAttempt_AndGetReportsWrongAttempt()
    {
        await using var database = await Database.CreateAsync();
        var (userId, sessionId, itemId, _) = await database.SeedRecap(dictation: true);
        var requestId = Guid.NewGuid();
        var request = new SubmitPracticeAnswerRequest(itemId, "dictation", "wrong", RequestId: requestId);
        async Task Send()
        {
            await using var context = database.Context();
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId, request)).IsSuccess);
        }
        await Task.WhenAll(Send(), Send());
        await using var verify = database.Context();
        Assert.Equal(1, await verify.PracticeAttempts.CountAsync());
        var result = await new EfPracticeRepository(verify).GetSessionAsync(userId, sessionId);
        Assert.Equal("dictation", result.Value!.Items[0].CurrentStep);
        Assert.Equal(1, result.Value.Items[0].AttemptCount);
        Assert.Equal(requestId, result.Value.Items[0].LastAttempt!.RequestId);
        Assert.False(result.Value.Items[0].LastAttempt!.Correctness);
    }

    [LearningPostgresFact]
    public async Task ConcurrentRecapsForSameInactiveWord_OnlyFirstEnrollmentSetsLevel()
    {
        await using var database = await Database.CreateAsync();
        var (userId, firstSessionId, _, wordId) = await database.SeedRecap();
        Guid secondSessionId;
        await using (var context = database.Context())
        {
            var state = WordReviewState.CreateAtLevel(userId, wordId, 0, new(2026, 10, 5));
            state.Deactivate();
            context.WordReviewStates.Add(state);
            await context.SaveChangesAsync();
            var pageId = (await context.PracticeSessions.SingleAsync()).PageId;
            var second = await new EfPracticeRepository(context).CreateSessionAsync(userId, pageId, DateTime.UtcNow);
            secondSessionId = second.Value!.SessionId;
            var item = await context.PracticeSessionItems.SingleAsync(item => item.PracticeSessionId == secondSessionId);
            item.SkipStep(PracticeStep.Dictation, DateTime.UtcNow);
            item.SkipStep(PracticeStep.WordToMeaning, DateTime.UtcNow);
            item.SkipStep(PracticeStep.Pronunciation, DateTime.UtcNow);
            await context.SaveChangesAsync();
        }
        async Task<PracticeReviewLevelResultDto> Enroll(Guid sessionId, int level)
        {
            await using var context = database.Context();
            var result = await Service(context).SetReviewLevelAsync(userId, sessionId, wordId, new(level, "UTC"));
            Assert.True(result.IsSuccess);
            return result.Value!;
        }
        var results = await Task.WhenAll(Enroll(firstSessionId, 2), Enroll(secondSessionId, 4));
        Assert.Single(results, result => result.Status == "added");
        Assert.Single(results, result => result.Status == "alreadyInReview");
        await using var verify = database.Context();
        var saved = await verify.WordReviewStates.SingleAsync();
        Assert.Equal(results[0].Status == "added" ? 2 : 4, saved.Level);
        Assert.Equal(2, await verify.PracticeSessionItems.CountAsync(item => item.IsCompleted));
    }

    [LearningPostgresFact]
    public async Task ActiveReviewScheduleIsPreserved_AbandonedSessionRejectsMutation()
    {
        await using var database = await Database.CreateAsync();
        var (userId, sessionId, itemId, wordId) = await database.SeedRecap();
        var due = new DateOnly(2026, 12, 1);
        await using (var context = database.Context())
        {
            context.WordReviewStates.Add(WordReviewState.CreateAtLevel(userId, wordId, 5, due));
            await context.SaveChangesAsync();
            var result = await Service(context).SetReviewLevelAsync(userId, sessionId, wordId, new(0, "UTC"));
            Assert.Equal("alreadyInReview", result.Value!.Status);
        }
        await using (var verify = database.Context())
        {
            var state = await verify.WordReviewStates.SingleAsync();
            Assert.Equal(5, state.Level);
            Assert.Equal(due, state.NextReviewDate);
            (await verify.PracticeSessions.SingleAsync()).Abandon(DateTime.UtcNow);
            await verify.SaveChangesAsync();
        }
        await using (var context = database.Context())
        {
            var result = await Service(context).SubmitAnswerAsync(userId, sessionId, new(itemId, "recap", Skip: true, RequestId: Guid.NewGuid()));
            Assert.False(result.IsSuccess);
            Assert.Equal("PRACTICE_SESSION_CONFLICT", result.Error!.Code);
        }
    }

    [LearningPostgresFact]
    public async Task CorrectExercisesCanRetryRepeatedly_PreserveHistory_AndRejectStaleRetries()
    {
        await using var database = await Database.CreateAsync();
        var (userId, sessionId, itemId, _) = await database.SeedRecap(dictation: true);
        Guid firstAttempt = default;
        for (var index = 0; index < 4; index++)
        {
            var requestId = Guid.NewGuid();
            if (index == 0) firstAttempt = requestId;
            await using (var context = database.Context())
                Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                    new(itemId, "dictation", "alpha", RequestId: requestId))).IsSuccess);
            async Task Retry()
            {
                await using var context = database.Context();
                Assert.True((await Service(context).RetryStepAsync(userId, sessionId,
                    new(itemId, "dictation", requestId))).IsSuccess);
            }
            await Task.WhenAll(Retry(), Retry());
            await using var verify = database.Context();
            Assert.Equal(PracticeStep.Dictation, (await verify.PracticeSessionItems.SingleAsync()).CurrentStep);
            Assert.Equal(index + 1, await verify.PracticeAttempts.CountAsync());
            if (index > 0)
                Assert.False((await Service(verify).RetryStepAsync(userId, sessionId,
                    new(itemId, "dictation", firstAttempt))).IsSuccess);
        }

        await using (var context = database.Context())
        {
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "dictation", "alpha", RequestId: Guid.NewGuid()))).IsSuccess);
        }
        Guid meaningAttempt = Guid.NewGuid();
        await using (var context = database.Context())
        {
            var choice = (await context.PracticeSessionItems.SingleAsync()).CorrectAnswerSlotId;
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "wordToMeaning", AnswerSlotId: choice, RequestId: meaningAttempt))).IsSuccess);
        }
        await using (var context = database.Context())
        {
            Assert.True((await Service(context).RetryStepAsync(userId, sessionId, new(itemId, "wordToMeaning", meaningAttempt))).IsSuccess);
            Assert.Equal(PracticeStep.WordToMeaning, (await context.PracticeSessionItems.SingleAsync()).CurrentStep);
        }
        await using (var context = database.Context())
        {
            var choice = (await context.PracticeSessionItems.SingleAsync()).CorrectAnswerSlotId;
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "wordToMeaning", AnswerSlotId: choice, RequestId: Guid.NewGuid()))).IsSuccess);
        }
        Guid pronunciationAttempt = Guid.NewGuid();
        await using (var context = database.Context())
        {
            // Isolate retry persistence from Azure; the provider result is supplied directly.
            Assert.Equal(PracticeRepositoryOperationStatus.Success,
                (await new EfPracticeRepository(context).RecordPronunciationAttemptAsync(userId, sessionId, itemId,
                    new(true, 95, 100, "word", []), 0, DateTime.UtcNow, requestId: pronunciationAttempt)).Status);
        }
        await using (var context = database.Context())
            Assert.True((await Service(context).RetryStepAsync(userId, sessionId,
                new(itemId, "pronunciation", pronunciationAttempt))).IsSuccess);
        await using (var verify = database.Context())
        {
            Assert.Equal(PracticeStep.Pronunciation, (await verify.PracticeSessionItems.SingleAsync()).CurrentStep);
            Assert.Equal(8, await verify.PracticeAttempts.CountAsync());
        }
        await using (var context = database.Context())
            Assert.False((await Service(context).RetryStepAsync(Guid.NewGuid(), sessionId,
                new(itemId, "pronunciation", pronunciationAttempt))).IsSuccess);
        await using (var context = database.Context())
        {
            (await context.PracticeSessions.SingleAsync()).Abandon(DateTime.UtcNow);
            await context.SaveChangesAsync();
            Assert.False((await Service(context).RetryStepAsync(userId, sessionId,
                new(itemId, "pronunciation", pronunciationAttempt))).IsSuccess);
        }
    }

    [LearningPostgresFact]
    public async Task RetryRejectsWrongAnswers_SkippedSteps_AndCompletedItems()
    {
        await using var database = await Database.CreateAsync();
        var (userId, sessionId, itemId, _) = await database.SeedRecap(dictation: true);
        var wrongId = Guid.NewGuid();
        await using (var context = database.Context())
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "dictation", "wrong", RequestId: wrongId))).IsSuccess);
        await using (var context = database.Context())
            Assert.False((await Service(context).RetryStepAsync(userId, sessionId, new(itemId, "dictation", wrongId))).IsSuccess);
        var correctId = Guid.NewGuid();
        await using (var context = database.Context())
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "dictation", "alpha", RequestId: correctId))).IsSuccess);
        var skipId = Guid.NewGuid();
        await using (var context = database.Context())
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "wordToMeaning", Skip: true, RequestId: skipId))).IsSuccess);
        await using (var context = database.Context())
        {
            Assert.False((await Service(context).RetryStepAsync(userId, sessionId, new(itemId, "dictation", correctId))).IsSuccess);
            Assert.False((await Service(context).RetryStepAsync(userId, sessionId, new(itemId, "wordToMeaning", skipId))).IsSuccess);
            var item = await context.PracticeSessionItems.SingleAsync();
            Assert.Equal(PracticeStep.Pronunciation, item.CurrentStep);
            Assert.True(item.HasMistake);
        }
        await using (var context = database.Context())
        {
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "pronunciation", Skip: true))).IsSuccess);
            Assert.True((await Service(context).SubmitAnswerAsync(userId, sessionId,
                new(itemId, "recap", Skip: true))).IsSuccess);
        }
        await using (var context = database.Context())
        {
            Assert.False((await Service(context).RetryStepAsync(userId, sessionId, new(itemId, "dictation", correctId))).IsSuccess);
            Assert.True((await context.PracticeSessionItems.SingleAsync()).IsCompleted);
        }
    }

    private static PracticeService Service(AppDbContext context, IPracticeTransaction? transaction = null) =>
        new(new EfPracticeRepository(context), new ReviewService(new EfReviewRepository(context), null!), null!, transaction ?? new EfPracticeTransaction(context));

    private sealed class FailAfterSave(IPracticeTransaction inner) : IPracticeTransaction
    {
        public Task<OperationResult<T>> ExecuteAsync<T>(Guid userId, Guid sessionId, Func<CancellationToken, Task<OperationResult<T>>> action, CancellationToken cancellationToken = default) => inner.ExecuteAsync(userId, sessionId, action, cancellationToken);
        public async Task SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            await inner.SaveChangesAsync(cancellationToken);
            throw new IOException("Injected failure after writing both Recap changes, before commit.");
        }
    }
    private sealed class LearningPostgresFactAttribute : FactAttribute
    {
        public LearningPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_LEARNING_VALIDATION_POSTGRES")))
                Skip = "Set FLUENTA_LEARNING_VALIDATION_POSTGRES for dedicated database fluenta-learning-validation.";
        }
    }
    private sealed class Database(string admin, string scoped, string schema) : IAsyncDisposable
    {
        public AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(scoped).Options);
        public static async Task<Database> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("FLUENTA_LEARNING_VALIDATION_POSTGRES"));
            if (builder.Database != "fluenta-learning-validation") throw new InvalidOperationException("Refusing application database. Use only fluenta-learning-validation.");
            var schema = $"learning_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }
            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString) { SearchPath = schema, ApplicationName = "FluentA.LearningTests" };
            var result = new Database(builder.ConnectionString, scoped.ConnectionString, schema);
            try
            {
                await using var context = result.Context();
                await context.Database.ExecuteSqlRawAsync(context.Database.GenerateCreateScript());
                return result;
            }
            catch { await result.DisposeAsync(); throw; }
        }
        public async Task<(Guid UserId, Guid SessionId, Guid ItemId, Guid WordId)> SeedRecap(bool dictation = false)
        {
            await using var context = Context();
            var user = User.CreateWithPassword($"learning-{Guid.NewGuid():N}@example.test", "Learning test", "test-password-hash");
            var board = VocabBoard.Create(user.Id, "Board", "en");
            var page = VocabPage.Create(board.Id, "Page");
            var word = VocabWord.Create(page.Id, "alpha", "first", "/a/", WordType.Noun, null, "Alpha example.");
            context.Users.Add(user); context.Boards.Add(board); context.Pages.Add(page); context.Words.Add(word);
            await context.SaveChangesAsync();
            var created = await new EfPracticeRepository(context).CreateSessionAsync(user.Id, page.Id, DateTime.UtcNow);
            var session = created.Value!;
            var item = await context.PracticeSessionItems.SingleAsync();
            if (!dictation)
            {
                item.SkipStep(PracticeStep.Dictation, DateTime.UtcNow);
                item.SkipStep(PracticeStep.WordToMeaning, DateTime.UtcNow);
                item.SkipStep(PracticeStep.Pronunciation, DateTime.UtcNow);
                await context.SaveChangesAsync();
            }
            return (user.Id, session.SessionId, item.Id, word.Id);
        }
        public async ValueTask DisposeAsync()
        {
            await using var connection = new NpgsqlConnection(admin);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"DROP SCHEMA IF EXISTS \"{schema}\" CASCADE";
            await command.ExecuteNonQueryAsync();
        }
    }
}
