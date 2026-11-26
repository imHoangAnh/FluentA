using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class FreshBaselinePersistenceTests
{
    [BaselinePostgresFact]
    public async Task FreshSchema_ContainsRetainedFeatures_AndOmitsRemovedTables()
    {
        var raw = Environment.GetEnvironmentVariable("FLUENTA_BASELINE_VALIDATION_POSTGRES");
        var admin = new NpgsqlConnectionStringBuilder(raw);
        if (admin.Database != "fluenta_baseline_validation" || admin.Port != 5432)
            throw new InvalidOperationException("Use isolated fluenta_baseline_validation on port 5432.");

        var schema = $"baseline_test_{Guid.NewGuid():N}";
        await using var connection = new NpgsqlConnection(admin.ConnectionString);
        await connection.OpenAsync();
        await using var command = connection.CreateCommand();
        command.CommandText = $"CREATE SCHEMA \"{schema}\"";
        await command.ExecuteNonQueryAsync();
        try
        {
            var scoped = new NpgsqlConnectionStringBuilder(admin.ConnectionString) { SearchPath = schema };
            await using var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(scoped.ConnectionString).Options);
            await db.Database.MigrateAsync();

            var owner = User.CreateWithPassword($"baseline-{Guid.NewGuid():N}@example.test", "Owner", "hash");
            var entry = JournalEntry.Create(owner.Id, "Retained", DateTime.SpecifyKind(new DateTime(2026, 10, 9), DateTimeKind.Utc), "<p>Preserved</p>");
            db.AddRange(owner, entry);
            await db.SaveChangesAsync();

            command.CommandText = "SELECT table_name FROM information_schema.tables WHERE table_schema = @schema";
            command.Parameters.AddWithValue("schema", schema);
            var tables = new HashSet<string>(StringComparer.Ordinal);
            await using (var reader = await command.ExecuteReaderAsync())
            {
                while (await reader.ReadAsync()) tables.Add(reader.GetString(0));
            }

            Assert.Contains("users", tables);
            Assert.Contains("journal", tables);
            Assert.Contains("practice_sessions", tables);
            Assert.Contains("review_sessions", tables);
            Assert.DoesNotContain("pomodoro_configs", tables);
            Assert.DoesNotContain("pomodoro_sessions", tables);
            Assert.DoesNotContain("practice_settings", tables);
            Assert.DoesNotContain("notifications", tables);
            Assert.DoesNotContain("trash_entries", tables);
            Assert.Equal("<p>Preserved</p>", (await db.JournalEntries.SingleAsync()).Content);
            Assert.Equal(owner.Id, (await db.Users.SingleAsync()).Id);
            Assert.False(db.Database.HasPendingModelChanges());
        }
        finally
        {
            command.Parameters.Clear();
            command.CommandText = $"DROP SCHEMA \"{schema}\" CASCADE";
            await command.ExecuteNonQueryAsync();
        }
    }

    private sealed class BaselinePostgresFactAttribute : FactAttribute
    {
        public BaselinePostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_BASELINE_VALIDATION_POSTGRES")))
                Skip = "Set FLUENTA_BASELINE_VALIDATION_POSTGRES for isolated PostgreSQL proof.";
        }
    }
}
