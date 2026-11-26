using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Todo.Enums;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Todo;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class EfTodoRepositorySoftDeleteTests
{
    [TodoPostgresFact]
    public async Task DeleteOccurrence_RetainsPastAndRows_ButHidesSelectedAndFuture()
    {
        await using var database = await TodoDatabase.CreateAsync();
        var owner = Guid.Empty;
        Guid pastId;
        Guid selectedId;
        Guid futureId;

        await using (var context = database.CreateContext())
        {
            var user = User.CreateWithPassword($"todo-{Guid.NewGuid():N}@example.test", "Todo owner", "hash");
            owner = user.Id;
            context.Users.Add(user);
            var repository = new EfTodoRepository(context);
            var past = TodoItem.Create(owner, "Daily", Utc(2035, 7, 20), null, repeatPattern: TodoRepeatPattern.Daily);
            await repository.AddAsync(past);
            await repository.SetCompletionAsync(owner, past.Id, true, Utc(2035, 7, 20, 10));
            var selected = Assert.Single(await repository.ListByDateAsync(owner, Utc(2035, 7, 21)));
            await repository.SetCompletionAsync(owner, selected.Id, true, Utc(2035, 7, 21, 10));
            var future = Assert.Single(await repository.ListByDateAsync(owner, Utc(2035, 7, 22)));
            pastId = past.Id;
            selectedId = selected.Id;
            futureId = future.Id;
        }

        await using (var context = database.CreateContext())
        {
            var repository = new EfTodoRepository(context);
            Assert.False(await repository.SoftDeleteFutureOccurrencesAsync(Guid.NewGuid(), selectedId, DateTime.UtcNow));
            Assert.True(await repository.SoftDeleteFutureOccurrencesAsync(owner, selectedId, DateTime.UtcNow));
            Assert.False(await repository.SoftDeleteFutureOccurrencesAsync(owner, selectedId, DateTime.UtcNow));
            Assert.Single(await repository.ListByDateAsync(owner, Utc(2035, 7, 20)));
            Assert.Empty(await repository.ListByDateAsync(owner, Utc(2035, 7, 21)));
            Assert.Empty(await repository.ListByDateAsync(owner, Utc(2035, 7, 22)));
        }

        await using (var context = database.CreateContext())
        {
            var rows = await context.TodoItems.Where(item => item.UserId == owner).ToDictionaryAsync(item => item.Id);
            Assert.Equal(3, rows.Count);
            Assert.Null(rows[pastId].DeletedAt);
            Assert.NotNull(rows[selectedId].DeletedAt);
            Assert.Equal(rows[selectedId].DeletedAt, rows[futureId].DeletedAt);
        }
    }

    private static DateTime Utc(int year, int month, int day, int hour = 0) =>
        new(year, month, day, hour, 0, 0, DateTimeKind.Utc);

    private sealed class TodoPostgresFactAttribute : FactAttribute
    {
        public TodoPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(TodoDatabase.RawConnectionString))
                Skip = "Set FLUENTA_TODO_VALIDATION_POSTGRES to run the isolated PostgreSQL proof.";
        }
    }

    private sealed class TodoDatabase : IAsyncDisposable
    {
        private readonly string _adminConnectionString;
        private readonly string _schema;

        private TodoDatabase(string adminConnectionString, string scopedConnectionString, string schema)
        {
            _adminConnectionString = adminConnectionString;
            ConnectionString = scopedConnectionString;
            _schema = schema;
        }

        public static string? RawConnectionString => Environment.GetEnvironmentVariable("FLUENTA_TODO_VALIDATION_POSTGRES");
        public string ConnectionString { get; }

        public static async Task<TodoDatabase> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(RawConnectionString);
            if (builder.Database != "fluenta_todo_validation" || builder.Port != 15440)
                throw new InvalidOperationException("Todo proof requires isolated fluenta_todo_validation on port 15440.");

            var schema = $"todo_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString) { SearchPath = schema };
            var database = new TodoDatabase(builder.ConnectionString, scoped.ConnectionString, schema);
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
