using System.Data;
using System.Data.Common;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Habit;
using FluentA.Infrastructure.Persistence.Repositories.Note;
using FluentA.Infrastructure.Persistence.Repositories.Project;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace FluentA.Infrastructure.UnitTests;

public sealed class ListQueryProjectionTests
{
    [Fact]
    public async Task NotesList_SelectsOnlyActivePageMetadataAndDoesNotTrackEntities()
    {
        var capture = new CaptureEmptyQuery();
        await using var db = CreateContext(capture);
        var owner = Guid.NewGuid();
        Assert.Empty(await new EfNoteRepository(db).ListBoardsAsync(owner));
        var sql = Assert.Single(capture.Commands);
        Assert.DoesNotContain("content", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("deleted_at IS NULL", sql);
        Assert.Contains("user_id =", sql);
        Assert.Contains("ORDER BY", sql);
        Assert.Contains(owner, capture.ParameterValues);
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Fact]
    public async Task ProjectList_CountsActiveChildrenInSqlWithoutLoadingCardPayloads()
    {
        var capture = new CaptureEmptyQuery();
        await using var db = CreateContext(capture);
        var owner = Guid.NewGuid();
        Assert.Empty(await new EfProjectRepository(db).ListBoardsAsync(owner));
        var sql = Assert.Single(capture.Commands);
        Assert.Contains("count(", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("description", sql, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("priority", sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("deleted_at IS NULL", sql);
        Assert.Contains(owner, capture.ParameterValues);
        Assert.Empty(db.ChangeTracker.Entries());
    }

    [Fact]
    public async Task HabitStatistics_SelectsOnlyHabitIdAndDateWithoutTrackingHistory()
    {
        var capture = new CaptureEmptyQuery();
        await using var db = CreateContext(capture);
        var start = DateTime.SpecifyKind(new DateTime(2020, 1, 1), DateTimeKind.Utc);
        Assert.Empty(await new EfHabitRepository(db).ListCheckInDatesAsync([Guid.NewGuid()], start, start.AddYears(5)));
        var sql = Assert.Single(capture.Commands);
        var selection = sql[..sql.IndexOf("FROM", StringComparison.Ordinal)];
        Assert.Contains("habit_id", selection);
        Assert.Contains("date", selection);
        Assert.DoesNotContain("created_at", selection);
        Assert.DoesNotContain("updated_at", selection);
        Assert.Contains("deleted_at IS NULL", sql);
        Assert.Empty(db.ChangeTracker.Entries());
    }

    private static AppDbContext CreateContext(CaptureEmptyQuery capture) => new(
        new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=translation_test;Username=test;Password=test")
            .AddInterceptors(capture, new SuppressConnection()).Options);

    private sealed class SuppressConnection : DbConnectionInterceptor
    {
        public override ValueTask<InterceptionResult> ConnectionOpeningAsync(DbConnection connection,
            ConnectionEventData eventData, InterceptionResult result, CancellationToken cancellationToken = default) =>
            ValueTask.FromResult(InterceptionResult.Suppress());
    }

    private sealed class CaptureEmptyQuery : DbCommandInterceptor
    {
        public List<string> Commands { get; } = [];
        public List<object?> ParameterValues { get; } = [];
        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(DbCommand command,
            CommandEventData eventData, InterceptionResult<DbDataReader> result, CancellationToken cancellationToken = default)
        {
            Commands.Add(command.CommandText);
            ParameterValues.AddRange(command.Parameters.Cast<DbParameter>().Select(parameter => parameter.Value));
            var table = new DataTable();
            table.Columns.Add("value", typeof(object));
            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(table.CreateDataReader()));
        }
    }
}
