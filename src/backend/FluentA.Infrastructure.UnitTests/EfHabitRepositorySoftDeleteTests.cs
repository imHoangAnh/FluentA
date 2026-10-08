using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Habit.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Habit;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class EfHabitRepositorySoftDeleteTests
{
    [HabitPostgresFact]
    public async Task Delete_RetainsHabitAndUnchangedHistory_ButBlocksAccessAndForeignOwnership()
    {
        await using var database = await HabitDatabase.CreateAsync();
        Guid owner;
        Guid id;
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);
        var deletedAt = DateTime.UtcNow;
        List<HabitEntry> originalEntries;
        await using (var context = database.CreateContext())
        {
            var user = User.CreateWithPassword($"habit-{Guid.NewGuid():N}@example.test", "Habit owner", "hash");
            context.Users.Add(user);
            owner = user.Id;
            var habit = Habit.Create(owner, "Read", null, HabitIcon.Book, HabitFrequency.Daily, null, today.AddDays(-2), goalDays: 2);
            var repository = new EfHabitRepository(context);
            await repository.AddAsync(habit);
            id = habit.Id;
            Assert.Equal(HabitEntryMutationStatus.Checked, (await repository.ToggleEntryAsync(owner, id, today.AddDays(-1))).Status);
            Assert.True((await repository.ToggleEntryAsync(owner, id, today)).IsGoalCompleted);
            Assert.Equal(HabitEntryMutationStatus.GoalReached, (await repository.ToggleEntryAsync(owner, id, today.AddDays(-2))).Status);
            Assert.False((await repository.ToggleEntryAsync(owner, id, today)).IsGoalCompleted);
            Assert.True((await repository.ToggleEntryAsync(owner, id, today)).IsGoalCompleted);
            originalEntries = await context.HabitEntries.AsNoTracking().OrderBy(entry => entry.Date).ToListAsync();
        }

        await using (var context = database.CreateContext())
        {
            var repository = new EfHabitRepository(context);
            Assert.False(await repository.SoftDeleteAsync(Guid.NewGuid(), id, deletedAt));
            Assert.Single(await repository.ListAsync(owner));
            Assert.True(await repository.SoftDeleteAsync(owner, id, deletedAt));
            Assert.False(await repository.SoftDeleteAsync(owner, id, deletedAt.AddMinutes(1)));
            Assert.Empty(await repository.ListAsync(owner));
            Assert.Null(await repository.GetAsync(owner, id));
            Assert.Equal(HabitEntryMutationStatus.NotFound, (await repository.ToggleEntryAsync(owner, id, today)).Status);
            var service = new HabitService(repository);
            Assert.False((await service.ListEntriesAsync(owner, id, today.ToString("yyyy-MM"), "UTC")).IsSuccess);
            Assert.False((await service.UpdateAsync(owner, id, new UpdateHabitRequest { Name = "Renamed" })).IsSuccess);
        }

        await using var verify = database.CreateContext();
        var retained = await verify.Habits.SingleAsync();
        Assert.Equal(id, retained.Id);
        Assert.Equal(deletedAt, retained.DeletedAt!.Value, TimeSpan.FromMilliseconds(1));
        Assert.Equal(deletedAt, retained.UpdatedAt, TimeSpan.FromMilliseconds(1));
        Assert.Equal(2, retained.GoalDays);
        var entries = await verify.HabitEntries.OrderBy(entry => entry.Date).ToListAsync();
        Assert.Equal(originalEntries.Count, entries.Count);
        Assert.Equal(2, entries.Count);
        for (var index = 0; index < entries.Count; index++)
        {
            Assert.Equal(originalEntries[index].Id, entries[index].Id);
            Assert.Equal(originalEntries[index].Date, entries[index].Date);
            Assert.Equal(originalEntries[index].CreatedAt, entries[index].CreatedAt);
            Assert.Equal(originalEntries[index].UpdatedAt, entries[index].UpdatedAt);
            Assert.Null(entries[index].DeletedAt);
        }
        Assert.Empty(await verify.TrashEntries.ToListAsync());
        Assert.Empty(await verify.Notifications.ToListAsync());

        await using var connection = new NpgsqlConnection(database.ConnectionString);
        await connection.OpenAsync();
        await using var schemaCheck = connection.CreateCommand();
        schemaCheck.CommandText = "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'habits'";
        await using var reader = await schemaCheck.ExecuteReaderAsync();
        var columns = new Dictionary<string, string>();
        while (await reader.ReadAsync()) columns.Add(reader.GetString(0), reader.GetString(1));
        Assert.Equal("timestamp with time zone", columns["deleted_at"]);
        Assert.DoesNotContain("reminder_enabled", columns.Keys);
        Assert.DoesNotContain("reminder_time", columns.Keys);
        Assert.DoesNotContain("last_reminder_sent_on", columns.Keys);
    }

    [HabitPostgresFact]
    public async Task EditLoadedBeforeDelete_CannotRestoreDeletedHabit()
    {
        await using var database = await HabitDatabase.CreateAsync();
        await using var editContext = database.CreateContext();
        var user = User.CreateWithPassword($"habit-edit-{Guid.NewGuid():N}@example.test", "Owner", "hash");
        editContext.Users.Add(user);
        var habit = Habit.Create(user.Id, "Read", null, HabitIcon.Book, HabitFrequency.Daily, null);
        var editRepository = new EfHabitRepository(editContext);
        await editRepository.AddAsync(habit);
        await using (var deleteContext = database.CreateContext())
        {
            Assert.True(await new EfHabitRepository(deleteContext).SoftDeleteAsync(user.Id, habit.Id, DateTime.UtcNow));
        }
        habit.Update("Edited", null, habit.Icon, habit.Frequency, null, habit.StartDate, null, entryCount: 0);
        await editRepository.UpdateAsync(habit);
        await using var verify = database.CreateContext();
        Assert.NotNull((await verify.Habits.SingleAsync()).DeletedAt);
        Assert.Empty(await new EfHabitRepository(verify).ListAsync(user.Id));
    }

    private sealed class HabitPostgresFactAttribute : FactAttribute
    {
        public HabitPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(HabitDatabase.RawConnectionString))
                Skip = "Set FLUENTA_HABIT_VALIDATION_POSTGRES to run the isolated PostgreSQL proof.";
        }
    }

    private sealed class HabitDatabase : IAsyncDisposable
    {
        private readonly string _adminConnectionString;
        private readonly string _schema;

        private HabitDatabase(string adminConnectionString, string scopedConnectionString, string schema)
        {
            _adminConnectionString = adminConnectionString;
            ConnectionString = scopedConnectionString;
            _schema = schema;
        }

        public static string? RawConnectionString => Environment.GetEnvironmentVariable("FLUENTA_HABIT_VALIDATION_POSTGRES");
        public string ConnectionString { get; }

        public static async Task<HabitDatabase> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(RawConnectionString);
            if (builder.Database != "fluenta_habit_validation" || builder.Port != 15441)
                throw new InvalidOperationException("Habit proof requires isolated fluenta_habit_validation on port 15441.");

            var schema = $"habit_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString) { SearchPath = schema };
            var database = new HabitDatabase(builder.ConnectionString, scoped.ConnectionString, schema);
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
