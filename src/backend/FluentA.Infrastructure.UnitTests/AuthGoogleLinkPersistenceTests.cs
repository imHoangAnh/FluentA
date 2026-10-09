using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Persistence.Repositories.Auth;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class AuthGoogleLinkPersistenceTests
{
    [AuthPostgresFact]
    public async Task PasswordAccount_RejectsImplicitLink_AndRequiresPasswordConfirmedLink()
    {
        await using var database = await Database.CreateAsync();
        Guid userId;
        await using (var seed = database.Context())
        {
            var user = User.CreateWithPassword("auth-link@example.test", "Auth proof", "password-hash");
            user.MarkEmailVerified(DateTime.UtcNow);
            seed.Users.Add(user);
            await seed.SaveChangesAsync();
            userId = user.Id;
        }

        await using (var context = database.Context())
        {
            var result = await new EfRefreshTokenRepository(context).TryCreateForGoogleLoginAsync(
                "auth-link@example.test", "Google user", "old-subject", "token-hash",
                DateTime.UtcNow, DateTime.UtcNow.AddDays(7), IssueAccess);
            Assert.Equal(GoogleLoginResult.LinkRequired, result.Result);
            Assert.Null(result.AccessToken);
            Assert.Empty(await context.RefreshTokens.ToArrayAsync());
            Assert.Null((await context.Users.SingleAsync()).GoogleId);
        }

        await using (var context = database.Context())
        {
            var users = new EfUserRepository(context);
            Assert.False(await users.TryLinkGoogleAsync(userId, "auth-link@example.test", "wrong-hash", "new-subject", DateTime.UtcNow));
            Assert.True(await users.TryLinkGoogleAsync(userId, "auth-link@example.test", "password-hash", "new-subject", DateTime.UtcNow));
        }

        await using (var context = database.Context())
        {
            var user = await context.Users.AsNoTracking().SingleAsync();
            Assert.Equal("new-subject", user.GoogleId);
            Assert.NotNull(user.GoogleLinkConfirmedAt);
            var result = await new EfRefreshTokenRepository(context).TryCreateForGoogleLoginAsync(
                user.Email, "Google user", "new-subject", "linked-token-hash",
                DateTime.UtcNow, DateTime.UtcNow.AddDays(7), IssueAccess);
            Assert.Equal(GoogleLoginResult.Authenticated, result.Result);
            Assert.Single(await context.RefreshTokens.ToArrayAsync());
        }
    }

    [AuthPostgresFact]
    public async Task LegacyDualAccount_BlocksGoogleLoginUntilPasswordOwnerReconfirms()
    {
        await using var database = await Database.CreateAsync();
        Guid userId;
        await using (var seed = database.Context())
        {
            var user = User.CreateWithPassword("legacy-auth@example.test", "Legacy user", "password-hash");
            user.MarkEmailVerified(DateTime.UtcNow);
            user.LinkGoogleAccount("old-subject", DateTime.UtcNow);
            seed.Users.Add(user);
            await seed.SaveChangesAsync();
            userId = user.Id;
            await seed.Database.ExecuteSqlRawAsync("UPDATE users SET google_link_confirmed_at = NULL WHERE id = {0}", userId);
        }

        await using (var context = database.Context())
        {
            var result = await new EfRefreshTokenRepository(context).TryCreateForGoogleLoginAsync(
                "legacy-auth@example.test", "Legacy user", "old-subject", "legacy-token-hash",
                DateTime.UtcNow, DateTime.UtcNow.AddDays(7), IssueAccess);
            Assert.Equal(GoogleLoginResult.LinkRequired, result.Result);
            Assert.Empty(await context.RefreshTokens.ToArrayAsync());
        }

        await using (var context = database.Context())
        {
            var users = new EfUserRepository(context);
            Assert.True(await users.TryLinkGoogleAsync(userId, "legacy-auth@example.test", "password-hash", "new-subject", DateTime.UtcNow));
        }

        await using (var context = database.Context())
        {
            var user = await context.Users.AsNoTracking().SingleAsync();
            Assert.Equal("new-subject", user.GoogleId);
            Assert.NotNull(user.GoogleLinkConfirmedAt);
            var rejectedOld = await new EfRefreshTokenRepository(context).TryCreateForGoogleLoginAsync(
                user.Email, "Legacy user", "old-subject", "old-token-hash",
                DateTime.UtcNow, DateTime.UtcNow.AddDays(7), IssueAccess);
            Assert.Equal(GoogleLoginResult.AccountConflict, rejectedOld.Result);
        }
    }

    private static AccessTokenIssue IssueAccess(Guid _) => new("test-jwt", DateTime.UtcNow.AddMinutes(5));

    private sealed class AuthPostgresFactAttribute : FactAttribute
    {
        public AuthPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_AUTH_VALIDATION_POSTGRES")))
                Skip = "Set FLUENTA_AUTH_VALIDATION_POSTGRES for isolated fluenta-auth-validation.";
        }
    }

    private sealed class Database(string admin, string scoped, string schema) : IAsyncDisposable
    {
        public AppDbContext Context() => new(new DbContextOptionsBuilder<AppDbContext>().UseNpgsql(scoped).Options);

        public static async Task<Database> CreateAsync()
        {
            var builder = new NpgsqlConnectionStringBuilder(Environment.GetEnvironmentVariable("FLUENTA_AUTH_VALIDATION_POSTGRES"));
            if (builder.Database != "fluenta-auth-validation"
                || builder.Host is not ("127.0.0.1" or "localhost")
                || builder.Port == 5432)
                throw new InvalidOperationException("Auth proof requires an isolated local fluenta-auth-validation database.");

            var schema = $"auth_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(builder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scoped = new NpgsqlConnectionStringBuilder(builder.ConnectionString)
            {
                SearchPath = schema,
                ApplicationName = "FluentA.AuthTests"
            };
            var result = new Database(builder.ConnectionString, scoped.ConnectionString, schema);
            try
            {
                await using var context = result.Context();
                await context.Database.ExecuteSqlRawAsync(context.Database.GenerateCreateScript());
                return result;
            }
            catch
            {
                await result.DisposeAsync();
                throw;
            }
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
