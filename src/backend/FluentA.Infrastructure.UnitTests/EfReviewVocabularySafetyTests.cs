using System.Data;
using System.Data.Common;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Review;
using FluentA.Infrastructure.Persistence.Repositories.Vocabulary;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace FluentA.Infrastructure.UnitTests;

public sealed class EfReviewVocabularySafetyTests
{
    [Fact]
    public async Task ReviewDashboardCountsOnlyDueStatesForActiveVocabulary()
    {
        var interceptor = new FakePostgresInterceptor();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=review_safety_test;Username=test;Password=test")
            .AddInterceptors(interceptor, new SuppressConnectionOpenInterceptor())
            .Options;

        await using var dbContext = new AppDbContext(options);
        var repository = new EfReviewRepository(dbContext);

        var dashboard = await repository.GetDashboardAsync(
            Guid.NewGuid(),
            TimeZoneInfo.Utc,
            new DateTime(2026, 10, 1, 12, 0, 0, DateTimeKind.Utc));

        Assert.Equal(new DateOnly(2026, 10, 1), dashboard.LocalDate);
        Assert.Equal(0, dashboard.DueCount);
        var sql = Assert.Single(interceptor.Commands);
        Assert.Contains("word_review_states", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("vocab_words", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("vocab_pages", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("vocab_boards", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("deleted_at", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("next_review_date", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("<=", sql, StringComparison.Ordinal);
    }

    [Fact]
    public void PermanentVocabularyDeleteDoesNotCascadeThroughCompletedLearningHistory()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=review_model_test;Username=test;Password=test")
            .Options;
        using var dbContext = new AppDbContext(options);
        var model = dbContext.Model;
        var vocabularyTypes = new HashSet<Type>
        {
            typeof(VocabBoard),
            typeof(VocabPage),
            typeof(VocabWord),
        };
        var learningHistoryTypes = new[]
        {
            typeof(ReviewSession),
            typeof(ReviewSessionItem),
            typeof(ReviewAttempt),
            typeof(WordReviewHistory),
            typeof(PracticeSession),
            typeof(PracticeSessionItem),
            typeof(PracticeAttempt),
            typeof(PracticeSessionSummary),
        };

        foreach (var historyType in learningHistoryTypes)
        {
            var entityType = Assert.IsAssignableFrom<Microsoft.EntityFrameworkCore.Metadata.IEntityType>(model.FindEntityType(historyType));
            Assert.DoesNotContain(entityType.GetForeignKeys(), foreignKey => vocabularyTypes.Contains(foreignKey.PrincipalEntityType.ClrType));
        }

        var reviewState = Assert.IsAssignableFrom<Microsoft.EntityFrameworkCore.Metadata.IEntityType>(model.FindEntityType(typeof(WordReviewState)));
        var wordForeignKey = Assert.Single(reviewState.GetForeignKeys());
        Assert.Equal(typeof(VocabWord), wordForeignKey.PrincipalEntityType.ClrType);
        Assert.Equal(DeleteBehavior.Cascade, wordForeignKey.DeleteBehavior);

        var wordHistory = Assert.IsAssignableFrom<Microsoft.EntityFrameworkCore.Metadata.IEntityType>(model.FindEntityType(typeof(WordReviewHistory)));
        var historyItemForeignKey = Assert.Single(wordHistory.GetForeignKeys());
        Assert.Equal(typeof(ReviewSessionItem), historyItemForeignKey.PrincipalEntityType.ClrType);
        Assert.Equal(DeleteBehavior.SetNull, historyItemForeignKey.DeleteBehavior);
    }

    private sealed class SuppressConnectionOpenInterceptor : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(
            DbConnection connection,
            ConnectionEventData eventData,
            InterceptionResult result,
            CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());
    }

    private sealed class FakePostgresInterceptor : DbCommandInterceptor
    {
        public List<string> Commands { get; } = [];

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Commands.Add(command.CommandText);
            var table = new DataTable();
            table.Columns.Add("count", typeof(int));
            table.Rows.Add(0);
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(table.CreateDataReader()));
        }
    }
}
