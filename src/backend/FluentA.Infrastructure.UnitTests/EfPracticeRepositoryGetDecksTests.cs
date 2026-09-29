using System.Data;
using System.Data.Common;
using System.Text.RegularExpressions;
using FluentA.Application.BoundedContexts.Practice.DTOs;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Practice;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace FluentA.Infrastructure.UnitTests;

public sealed class EfPracticeRepositoryGetDecksTests
{
    [Theory]
    [InlineData(null, 1)]
    [InlineData(null, 2)]
    [InlineData("deck", 1)]
    [InlineData("deck", 2)]
    [InlineData("DECK", 1)]
    [InlineData("DECK", 2)]
    [InlineData("%", 1)]
    [InlineData("%", 2)]
    public async Task GetDecksAsync_translates_search_and_ordered_paging(string? search, int page)
    {
        var interceptor = new FakePostgresInterceptor();
        var connectionInterceptor = new SuppressConnectionOpenInterceptor();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=127.0.0.1;Port=1;Database=translation_test;Username=test;Password=test")
            .AddInterceptors(interceptor, connectionInterceptor)
            .Options;

        await using var dbContext = new AppDbContext(options);
        var repository = new EfPracticeRepository(dbContext);

        var result = await repository.GetDecksAsync(
            Guid.NewGuid(),
            Guid.NewGuid(),
            search,
            page,
            pageSize: 5);

        Assert.Equal(PracticeRepositoryOperationStatus.Success, result.Status);
        Assert.NotNull(result.Page);
        Assert.Equal(page, result.Page.Page);
        Assert.Equal(5, result.Page.PageSize);
        Assert.Equal(0, result.Page.TotalCount);
        Assert.Empty(result.Page.Items);
        Assert.Equal(3, interceptor.Commands.Count);

        var existsCommand = interceptor.Commands[0];
        var countCommand = interceptor.Commands[1];
        var pageCommand = interceptor.Commands[2];
        Assert.Contains("EXISTS", existsCommand.Sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("COUNT(", countCommand.Sql, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("ORDER BY", pageCommand.Sql, StringComparison.OrdinalIgnoreCase);
        AssertParameterValue(pageCommand, "LIMIT", 5);
        AssertParameterValue(pageCommand, "OFFSET", (page - 1) * 5);

        if (search is null)
        {
            Assert.DoesNotContain("LIKE", pageCommand.Sql, StringComparison.OrdinalIgnoreCase);
        }
        else
        {
            AssertParameterValue(pageCommand, "LIKE", $"%{EscapeLike(search.ToLowerInvariant())}%");
        }
    }

    private static string EscapeLike(string value) =>
        value.Replace("\\", "\\\\").Replace("%", "\\%").Replace("_", "\\_");

    private static void AssertParameterValue(CapturedCommand command, string clause, object expectedValue)
    {
        var match = Regex.Match(command.Sql, $@"{clause}\s+@(?<name>[\w]+)", RegexOptions.IgnoreCase);
        Assert.True(match.Success, $"Expected {clause} to use a SQL parameter. SQL: {command.Sql}");
        var parameter = Assert.Single(command.Parameters, item =>
            string.Equals(item.Name.TrimStart('@'), match.Groups["name"].Value, StringComparison.OrdinalIgnoreCase));
        Assert.Equal(expectedValue, parameter.Value is int integer ? integer : Convert.ToString(parameter.Value));
    }

    private sealed record CapturedCommand(string Sql, IReadOnlyList<CapturedParameter> Parameters);
    private sealed record CapturedParameter(string Name, object? Value);

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
        public List<CapturedCommand> Commands { get; } = [];

        public override ValueTask<InterceptionResult<DbDataReader>> ReaderExecutingAsync(
            DbCommand command,
            CommandEventData eventData,
            InterceptionResult<DbDataReader> result,
            CancellationToken cancellationToken = default)
        {
            Commands.Add(new CapturedCommand(
                command.CommandText,
                command.Parameters.Cast<DbParameter>()
                    .Select(parameter => new CapturedParameter(
                        parameter.ParameterName,
                        parameter.Value is DBNull ? null : parameter.Value))
                    .ToArray()));

            if (Commands.Count == 1)
            {
                return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(ScalarReader(true)));
            }

            if (Commands.Count == 2)
            {
                return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(ScalarReader(0)));
            }

            return ValueTask.FromResult(InterceptionResult<DbDataReader>.SuppressWithResult(EmptyReader()));
        }

        private static DbDataReader ScalarReader<T>(T value)
        {
            var table = new DataTable();
            table.Columns.Add("value", typeof(T));
            table.Rows.Add(value);
            return table.CreateDataReader();
        }

        private static DbDataReader EmptyReader()
        {
            var table = new DataTable();
            table.Columns.Add("value", typeof(object));
            return table.CreateDataReader();
        }
    }
}
