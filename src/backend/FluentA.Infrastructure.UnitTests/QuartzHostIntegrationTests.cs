using System.Globalization;
using FluentA.Application.BoundedContexts.Notification;
using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Services;
using CountdownEvent = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Npgsql;
using Quartz;

namespace FluentA.Infrastructure.UnitTests;

/// <summary>
/// Hosted-process proof for the Quartz migration.  The existing scheduler
/// tests prove that a trigger can be persisted; these tests start the actual
/// infrastructure hosted services and exercise the business database boundary
/// as well.
///
/// Set FLUENTA_QUARTZ_VALIDATION_POSTGRES to the isolated
/// fluenta-quartz-validation15439 connection before running this class.
/// </summary>
public sealed class QuartzHostIntegrationTests
{
    [QuartzHostPostgresFact]
    public async Task Hosted_startup_provisions_schema_reconciles_seeded_todo_and_dispatches_reminder()
    {
        await using var database = await QuartzHostValidationDatabase.CreateAsync();
        var fireAtUtc = DateTime.UtcNow.AddSeconds(8);
        Guid userId;
        Guid todoId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "host-startup");
            var reminder = ReminderFor(fireAtUtc);
            var todo = TodoItem.Create(
                user.Id,
                "Hosted Quartz reminder",
                reminder.Date,
                note: null,
                reminderTime: reminder.Time,
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: fireAtUtc);
            seed.TodoItems.Add(todo);
            await seed.SaveChangesAsync();
            userId = user.Id;
            todoId = todo.Id;
        }

        await using var runtime = await HostedInfrastructure.StartAsync(database.ConnectionString);
        var scheduler = await runtime.Services.GetRequiredService<ISchedulerFactory>().GetScheduler();

        await WaitUntilAsync(
            () => database.HasQuartzTablesAsync(),
            TimeSpan.FromSeconds(10),
            "Quartz did not provision its tables in the isolated schema.");

        var occurrence = await WaitForOccurrenceAsync(scheduler, todoId, TimeSpan.FromSeconds(10));
        Assert.NotNull(occurrence);
        Assert.Equal(QuartzScheduleIdentity.OccurrenceJobKey, occurrence!.JobKey);
        Assert.InRange(
            ParseUtc(occurrence.JobDataMap["scheduledAtUtc"]),
            fireAtUtc.AddMilliseconds(-1),
            fireAtUtc.AddMilliseconds(1));

        foreach (var kind in Enum.GetValues<ScheduledMaintenanceKind>())
        {
            var maintenance = await scheduler.GetTrigger(
                QuartzScheduleIdentity.MaintenanceTriggerKey(kind));
            Assert.NotNull(maintenance);
            Assert.Equal(QuartzScheduleIdentity.MaintenanceJobKey, maintenance!.JobKey);
            Assert.Equal(
                ((int)kind).ToString(CultureInfo.InvariantCulture),
                maintenance.JobDataMap["maintenanceKind"]?.ToString());
        }

        await WaitUntilAsync(
            async () =>
            {
                await using var verify = database.CreateContext();
                return await verify.Notifications.AnyAsync(notification =>
                    notification.UserId == userId
                    && notification.Type == "TodoReminder");
            },
            TimeSpan.FromSeconds(20),
            "The hosted Quartz occurrence did not persist a Todo reminder notification.");

        await using (var verify = database.CreateContext())
        {
            var todo = await verify.TodoItems.SingleAsync(item => item.Id == todoId);
            Assert.NotNull(todo.ReminderSentAtUtc);

            var notification = await verify.Notifications.SingleAsync(item =>
                item.UserId == userId
                && item.Type == "TodoReminder");
            Assert.Equal("Hosted Quartz reminder", notification.Message);
        }
    }

    [QuartzHostPostgresFact]
    public async Task Committed_changes_reconcile_without_periodic_wait_and_rollback_does_not_dispatch()
    {
        await using var database = await QuartzHostValidationDatabase.CreateAsync();
        var originalFireAtUtc = DateTime.UtcNow.AddMinutes(10);
        Guid userId;
        Guid todoId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "host-commit");
            var reminder = ReminderFor(originalFireAtUtc);
            var todo = TodoItem.Create(
                user.Id,
                "Committed schedule change",
                reminder.Date,
                note: null,
                reminderTime: reminder.Time,
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: originalFireAtUtc);
            seed.TodoItems.Add(todo);
            await seed.SaveChangesAsync();
            userId = user.Id;
            todoId = todo.Id;
        }

        await using var runtime = await HostedInfrastructure.StartAsync(database.ConnectionString);
        var scheduler = await runtime.Services.GetRequiredService<ISchedulerFactory>().GetScheduler();
        var originalTrigger = await WaitForOccurrenceAsync(scheduler, todoId, TimeSpan.FromSeconds(10));
        Assert.NotNull(originalTrigger);
        var originalTriggerKey = originalTrigger!.Key;

        // No explicit transaction: SavedChanges is a commit for the normal
        // EF path, so the post-commit service should replace the trigger.
        var implicitCommitFireAtUtc = DateTime.UtcNow.AddMinutes(11);
        await ChangeReminderAsync(
            runtime.Services,
            todoId,
            implicitCommitFireAtUtc,
            explicitTransaction: false);
        var implicitTrigger = await WaitForReplacementTriggerAsync(
            scheduler,
            todoId,
            originalTriggerKey,
            implicitCommitFireAtUtc,
            TimeSpan.FromSeconds(10));
        Assert.NotNull(implicitTrigger);

        // An explicit transaction commits through DbTransactionInterceptor;
        // this must also replace the durable trigger immediately.
        var explicitCommitFireAtUtc = DateTime.UtcNow.AddMinutes(12);
        var implicitTriggerKey = implicitTrigger!.Key;
        await ChangeReminderAsync(
            runtime.Services,
            todoId,
            explicitCommitFireAtUtc,
            explicitTransaction: true);
        var explicitTrigger = await WaitForReplacementTriggerAsync(
            scheduler,
            todoId,
            implicitTriggerKey,
            explicitCommitFireAtUtc,
            TimeSpan.FromSeconds(10));
        Assert.NotNull(explicitTrigger);

        // A rolled-back insert must not produce a trigger or a notification.
        var rolledBackFireAtUtc = DateTime.UtcNow.AddSeconds(3);
        var rolledBackTodoId = Guid.Empty;
        await using (var scope = runtime.Services.CreateAsyncScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            await using var transaction = await context.Database.BeginTransactionAsync();
            var reminder = ReminderFor(rolledBackFireAtUtc);
            var todo = TodoItem.Create(
                userId,
                "Rolled back reminder",
                reminder.Date,
                note: null,
                reminderTime: reminder.Time,
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: rolledBackFireAtUtc);
            context.TodoItems.Add(todo);
            await context.SaveChangesAsync();
            rolledBackTodoId = todo.Id;
            await transaction.RollbackAsync();
        }

        await Task.Delay(TimeSpan.FromSeconds(5));
        Assert.Empty(await FindOccurrenceTriggersAsync(scheduler, rolledBackTodoId));

        await using (var verify = database.CreateContext())
        {
            Assert.False(await verify.TodoItems.AnyAsync(item => item.Id == rolledBackTodoId));
            Assert.False(await verify.Notifications.AnyAsync(notification =>
                notification.UserId == userId
                && notification.Message == "Rolled back reminder"));
        }
    }

    [QuartzHostPostgresFact]
    public async Task Hosted_restart_delivers_the_persisted_occurrence_once()
    {
        await using var database = await QuartzHostValidationDatabase.CreateAsync();
        // PostgreSQL timestamps preserve microseconds, not .NET's last tick.
        var fireAt = new DateTime(DateTime.UtcNow.AddSeconds(15).Ticks / 10 * 10, DateTimeKind.Utc);
        Guid todoId;
        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "host-restart");
            var reminder = ReminderFor(fireAt);
            var todo = TodoItem.Create(user.Id, "Survives restart", reminder.Date, note: null,
                reminderTime: reminder.Time, reminderTimeZoneId: "Asia/Ho_Chi_Minh", reminderScheduledAtUtc: fireAt);
            seed.TodoItems.Add(todo);
            await seed.SaveChangesAsync();
            todoId = todo.Id;
        }
        TriggerKey key;
        await using (var first = await HostedInfrastructure.StartAsync(database.ConnectionString))
        {
            var scheduler = await first.Services.GetRequiredService<ISchedulerFactory>().GetScheduler();
            key = (await WaitForOccurrenceAsync(scheduler, todoId, TimeSpan.FromSeconds(5)))!.Key;
            Assert.True(DateTime.UtcNow < fireAt, "The first host must stop before the reminder is due.");
        }
        await using (var second = await HostedInfrastructure.StartAsync(database.ConnectionString))
        {
            var scheduler = await second.Services.GetRequiredService<ISchedulerFactory>().GetScheduler();
            Assert.NotNull(await scheduler.GetTrigger(key));
            await WaitUntilAsync(async () =>
            {
                await using var verify = database.CreateContext();
                return await verify.Notifications.AnyAsync();
            }, TimeSpan.FromSeconds(25), "The restarted host did not deliver its persisted reminder.");
            await second.Services.GetRequiredService<IQuartzScheduleCoordinator>().ReconcileAsync();
            await Task.Delay(500);
            await using var verify = database.CreateContext();
            Assert.Single(await verify.Notifications.ToListAsync());
            Assert.NotNull((await verify.TodoItems.SingleAsync()).ReminderSentAtUtc);
        }
    }

    [QuartzHostPostgresFact]
    public async Task Hosted_reconciliation_prepares_next_countdown_cycle_even_when_current_alert_has_fired()
    {
        await using var database = await QuartzHostValidationDatabase.CreateAsync();
        var target = DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow,
            ResolveVietnamTimeZone()).Date.AddDays(1), DateTimeKind.Utc);
        Guid alertId;
        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "host-countdown");
            var countdown = CountdownEvent.Create(user.Id, "Next cycle", target,
                repeatPattern: CountdownRepeatPattern.Weekly);
            countdown.AddAlert("7DaysBefore", "00:00",
                CountdownSchedule.BuildAlertScheduledAtUtc(target, "7DaysBefore", "00:00"));
            countdown.Alerts.Single().MarkFired(DateTime.UtcNow);
            seed.CountdownEvents.Add(countdown);
            await seed.SaveChangesAsync();
            alertId = countdown.Alerts.Single().Id;
        }
        await using var runtime = await HostedInfrastructure.StartAsync(database.ConnectionString);
        var scheduler = await runtime.Services.GetRequiredService<ISchedulerFactory>().GetScheduler();
        var trigger = await WaitForOccurrenceAsync(scheduler, alertId, TimeSpan.FromSeconds(5));
        Assert.Equal(target.AddDays(7), ParseUtc(trigger!.JobDataMap["occurrenceDateUtc"]));
        Assert.Equal(CountdownSchedule.BuildAlertScheduledAtUtc(target.AddDays(7), "7DaysBefore", "00:00"),
            ParseUtc(trigger.JobDataMap["scheduledAtUtc"]));
        await using var verify = database.CreateContext();
        Assert.Equal(target, (await verify.CountdownEvents.SingleAsync()).TargetDate);
    }

    private static async Task ChangeReminderAsync(
        IServiceProvider services,
        Guid todoId,
        DateTime scheduledAtUtc,
        bool explicitTransaction)
    {
        await using var scope = services.CreateAsyncScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction? transaction = null;
        try
        {
            if (explicitTransaction)
            {
                transaction = await context.Database.BeginTransactionAsync();
            }

            var todo = await context.TodoItems.SingleAsync(item => item.Id == todoId);
            var reminder = ReminderFor(scheduledAtUtc);
            todo.SetReminder(reminder.Time, "Asia/Ho_Chi_Minh", scheduledAtUtc);
            await context.SaveChangesAsync();
            if (transaction is not null)
            {
                await transaction.CommitAsync();
            }
        }
        finally
        {
            if (transaction is not null)
            {
                await transaction.DisposeAsync();
            }
        }
    }

    private static async Task<ITrigger?> WaitForOccurrenceAsync(
        IScheduler scheduler,
        Guid sourceId,
        TimeSpan timeout)
    {
        ITrigger? found = null;
        await WaitUntilAsync(
            async () =>
            {
                var triggers = await FindOccurrenceTriggersAsync(scheduler, sourceId);
                found = triggers.SingleOrDefault();
                return found is not null;
            },
            timeout,
            $"Quartz did not reconcile an occurrence trigger for {sourceId:N}.");
        return found;
    }

    private static async Task<ITrigger?> WaitForReplacementTriggerAsync(
        IScheduler scheduler,
        Guid sourceId,
        TriggerKey oldTriggerKey,
        DateTime expectedScheduledAtUtc,
        TimeSpan timeout)
    {
        ITrigger? found = null;
        await WaitUntilAsync(
            async () =>
            {
                var triggers = await FindOccurrenceTriggersAsync(scheduler, sourceId);
                found = triggers.SingleOrDefault(trigger => trigger.Key != oldTriggerKey);
                return found is not null
                    && IsSameInstant(
                        expectedScheduledAtUtc,
                        ParseUtc(found.JobDataMap["scheduledAtUtc"]));
            },
            timeout,
            $"Quartz did not replace the occurrence trigger for {sourceId:N} after the committed schedule change.");
        return found;
    }

    private static async Task<IReadOnlyList<ITrigger>> FindOccurrenceTriggersAsync(
        IScheduler scheduler,
        Guid sourceId)
    {
        var keys = await scheduler.GetTriggerKeys(
            GroupMatcher<TriggerKey>.GroupEquals(QuartzScheduleIdentity.OccurrenceGroup));
        var triggers = new List<ITrigger>();
        foreach (var key in keys.Where(key => key.Name.Contains(
                     sourceId.ToString("N"),
                     StringComparison.OrdinalIgnoreCase)))
        {
            var trigger = await scheduler.GetTrigger(key);
            if (trigger is not null)
            {
                triggers.Add(trigger);
            }
        }

        return triggers;
    }

    private static async Task WaitUntilAsync(
        Func<Task<bool>> condition,
        TimeSpan timeout,
        string failureMessage)
    {
        var deadline = DateTime.UtcNow + timeout;
        while (DateTime.UtcNow < deadline)
        {
            if (await condition())
            {
                return;
            }

            await Task.Delay(TimeSpan.FromMilliseconds(100));
        }

        Assert.Fail(failureMessage);
    }

    private static DateTime ParseUtc(object? value)
    {
        Assert.NotNull(value);
        Assert.True(
            DateTime.TryParse(
                value!.ToString(),
                CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,
                out var parsed),
            $"Quartz trigger data was not a timestamp: {value}");
        return DateTime.SpecifyKind(parsed, DateTimeKind.Utc);
    }

    private static bool IsSameInstant(DateTime expected, DateTime actual) =>
        Math.Abs((expected - actual).Ticks) <= TimeSpan.TicksPerMillisecond;

    private static (DateTime Date, TimeOnly Time) ReminderFor(DateTime scheduledAtUtc)
    {
        var local = TimeZoneInfo.ConvertTimeFromUtc(scheduledAtUtc, ResolveVietnamTimeZone());
        return (DateTime.SpecifyKind(local.Date, DateTimeKind.Utc), TimeOnly.FromDateTime(local));
    }

    private static User AddUser(AppDbContext context, string prefix)
    {
        var user = User.CreateWithPassword(
            $"{prefix}-{Guid.NewGuid():N}@example.test",
            "Quartz host integration test",
            "test-password-hash");
        context.Users.Add(user);
        return user;
    }

    private static TimeZoneInfo ResolveVietnamTimeZone()
    {
        foreach (var id in new[] { "Asia/Ho_Chi_Minh", "SE Asia Standard Time" })
        {
            try
            {
                return TimeZoneInfo.FindSystemTimeZoneById(id);
            }
            catch (TimeZoneNotFoundException)
            {
            }
            catch (InvalidTimeZoneException)
            {
            }
        }

        throw new InvalidOperationException("The Vietnam timezone is not available on this host.");
    }

    private sealed class QuartzHostPostgresFactAttribute : FactAttribute
    {
        public QuartzHostPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(QuartzHostValidationDatabase.RawConnectionString))
            {
                Skip = "Set FLUENTA_QUARTZ_VALIDATION_POSTGRES to run the isolated Quartz host proof.";
            }
        }
    }

    private sealed class HostedInfrastructure : IAsyncDisposable
    {
        private readonly ServiceProvider _provider;
        private readonly IHostedService[] _hostedServices;
        private bool _stopped;

        private HostedInfrastructure(ServiceProvider provider, IHostedService[] hostedServices)
        {
            _provider = provider;
            _hostedServices = hostedServices;
        }

        public IServiceProvider Services => _provider;

        public static async Task<HostedInfrastructure> StartAsync(string connectionString)
        {
            var configuration = new ConfigurationBuilder()
                .AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:Postgres"] = connectionString,
                    ["Database:Postgres:ApplicationName"] = "FluentA.QuartzHostIntegrationTests",
                    ["Quartz:WorkerCount"] = "2",
                    ["Quartz:ReconciliationIntervalSeconds"] = "120",
                    ["AssetStorage:Enabled"] = "false",
                    ["Jwt:Key"] = "quartz-host-integration-jwt-key-0123456789",
                    ["Authentication:OtpHashKey"] = "quartz-host-integration-otp-key-0123456789",
                    ["Authentication:Google:ClientId"] = "quartz-host-integration-client",
                    ["Resend:ApiKey"] = "re_test_quartz_host_integration",
                    ["Resend:From"] = "quartz-host@example.test",
                    ["Frontend:BaseUrl"] = "https://localhost:5173",
                    ["AzureSpeech:Enabled"] = "false",
                })
                .Build();

            var services = new ServiceCollection();
            services.AddLogging(logging => logging.SetMinimumLevel(LogLevel.Warning));
            var hostLifetime = new TestHostApplicationLifetime();
            services.AddSingleton<IHostApplicationLifetime>(hostLifetime);
            services.AddFluentAInfrastructure(configuration);
            services.AddSingleton<INotificationSyncNotifier>(_ => NullNotificationSyncNotifier.Instance);
            var provider = services.BuildServiceProvider(new ServiceProviderOptions
            {
                ValidateScopes = true,
            });
            var hostedServices = provider.GetServices<IHostedService>().ToArray();

            try
            {
                foreach (var hostedService in hostedServices)
                {
                    await hostedService.StartAsync(CancellationToken.None);
                }

                hostLifetime.SignalStarted();
            }
            catch
            {
                await StopAsync(hostedServices);
                await provider.DisposeAsync();
                throw;
            }

            return new HostedInfrastructure(provider, hostedServices);
        }

        public async ValueTask DisposeAsync()
        {
            if (_stopped)
            {
                return;
            }

            _stopped = true;
            await StopAsync(_hostedServices);
            await _provider.DisposeAsync();
            GC.SuppressFinalize(this);
        }

        private static async Task StopAsync(IEnumerable<IHostedService> hostedServices)
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            foreach (var hostedService in hostedServices.Reverse())
            {
                await hostedService.StopAsync(timeout.Token);
            }
        }
    }

    private sealed class TestHostApplicationLifetime : IHostApplicationLifetime, IDisposable
    {
        private readonly CancellationTokenSource _started = new();
        private readonly CancellationTokenSource _stopping = new();
        private readonly CancellationTokenSource _stopped = new();

        public CancellationToken ApplicationStarted => _started.Token;

        public CancellationToken ApplicationStopping => _stopping.Token;

        public CancellationToken ApplicationStopped => _stopped.Token;

        public void StopApplication() => _stopping.Cancel();

        public void SignalStarted() => _started.Cancel();

        public void Dispose()
        {
            _stopped.Cancel();
            _started.Dispose();
            _stopping.Dispose();
            _stopped.Dispose();
        }
    }

    private sealed class QuartzHostValidationDatabase : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable = "FLUENTA_QUARTZ_VALIDATION_POSTGRES";
        private const string RequiredDatabaseName = "fluenta-quartz-validation15439";

        private readonly string _adminConnectionString;
        private readonly string _schema;

        private QuartzHostValidationDatabase(
            string adminConnectionString,
            string scopedConnectionString,
            string schema)
        {
            _adminConnectionString = adminConnectionString;
            ConnectionString = scopedConnectionString;
            _schema = schema;
        }

        public static string? RawConnectionString =>
            Environment.GetEnvironmentVariable(ConnectionEnvironmentVariable);

        public string ConnectionString { get; }

        public static async Task<QuartzHostValidationDatabase> CreateAsync()
        {
            var rawConnectionString = RawConnectionString;
            if (string.IsNullOrWhiteSpace(rawConnectionString))
            {
                throw new InvalidOperationException(
                    $"{ConnectionEnvironmentVariable} is required for the isolated Quartz host proof.");
            }

            var baseBuilder = new NpgsqlConnectionStringBuilder(rawConnectionString);
            if (!string.Equals(baseBuilder.Database, RequiredDatabaseName, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"The Quartz host proof only accepts database '{RequiredDatabaseName}'.");
            }

            if (string.Equals(baseBuilder.Database, "hcd_local", StringComparison.OrdinalIgnoreCase)
                || (baseBuilder.Port == 5432
                    && (baseBuilder.Host?.Contains("hcd_local", StringComparison.OrdinalIgnoreCase) ?? false)))
            {
                throw new InvalidOperationException(
                    "The Quartz host proof refuses the hcd_local:5432 database.");
            }

            var schema = $"quartz_host_test_{Guid.NewGuid():N}";
            await using (var connection = new NpgsqlConnection(baseBuilder.ConnectionString))
            {
                await connection.OpenAsync();
                await using var command = connection.CreateCommand();
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scopedBuilder = new NpgsqlConnectionStringBuilder(baseBuilder.ConnectionString)
            {
                SearchPath = schema,
                ApplicationName = "FluentA.QuartzHostIntegrationTests",
            };
            var database = new QuartzHostValidationDatabase(
                baseBuilder.ConnectionString,
                scopedBuilder.ConnectionString,
                schema);

            try
            {
                await using var context = database.CreateContext();
                await context.Database.MigrateAsync();
                return database;
            }
            catch
            {
                await database.DropSchemaAsync();
                throw;
            }
        }

        public AppDbContext CreateContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(ConnectionString)
                .Options;
            return new AppDbContext(options);
        }

        public async Task<bool> HasQuartzTablesAsync()
        {
            await using var connection = new NpgsqlConnection(ConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COUNT(*)
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name LIKE 'qrtz_%'
                """;
            var count = Convert.ToInt32(await command.ExecuteScalarAsync(), CultureInfo.InvariantCulture);
            return count > 0;
        }

        public async ValueTask DisposeAsync()
        {
            await DropSchemaAsync();
            GC.SuppressFinalize(this);
        }

        private async Task DropSchemaAsync()
        {
            await using var connection = new NpgsqlConnection(_adminConnectionString);
            await connection.OpenAsync();
            await using var command = connection.CreateCommand();
            command.CommandText = $"DROP SCHEMA IF EXISTS \"{_schema}\" CASCADE";
            await command.ExecuteNonQueryAsync();
        }
    }
}
