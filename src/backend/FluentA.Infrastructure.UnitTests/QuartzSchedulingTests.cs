using Quartz;
using Quartz.Impl;
using FluentA.Infrastructure.Scheduling;
using Npgsql;

namespace FluentA.Infrastructure.UnitTests;

public sealed class QuartzSchedulingTests
{
    [Fact]
    public void Occurrence_trigger_identity_changes_for_a_new_schedule_revision()
    {
        var sourceId = Guid.NewGuid();
        var scheduledAt = new DateTime(2026, 9, 17, 8, 0, 0, DateTimeKind.Utc);
        var original = new ScheduledOccurrence(
            ScheduledOccurrenceKind.TodoReminder,
            sourceId,
            scheduledAt.Date,
            scheduledAt,
            1);
        var changed = original with { ScheduledAtUtc = scheduledAt.AddMinutes(1), Revision = 2 };

        Assert.NotEqual(
            QuartzScheduleIdentity.OccurrenceTriggerKey(original),
            QuartzScheduleIdentity.OccurrenceTriggerKey(changed));
        Assert.Contains(sourceId.ToString("N"), QuartzScheduleIdentity.OccurrenceTriggerName(original));
    }

    [Fact]
    public void Maintenance_trigger_identity_is_stable_per_kind()
    {
        Assert.Equal(
            QuartzScheduleIdentity.MaintenanceTriggerKey(ScheduledMaintenanceKind.TrashPurge),
            QuartzScheduleIdentity.MaintenanceTriggerKey(ScheduledMaintenanceKind.TrashPurge));
        Assert.NotEqual(
            QuartzScheduleIdentity.MaintenanceTriggerKey(ScheduledMaintenanceKind.TrashPurge),
            QuartzScheduleIdentity.MaintenanceTriggerKey(ScheduledMaintenanceKind.DatabaseCleanup));
    }

    [QuartzPostgresFact]
    public async Task Persistent_trigger_survives_scheduler_restart_without_dropping_schema()
    {
        await using var database = await QuartzValidationDatabase.CreateAsync();
        var connectionString = database.ConnectionString;
        var suffix = Guid.NewGuid().ToString("N");
        var jobKey = new JobKey($"integration-probe-{suffix}", "FluentA.Integration");
        var triggerKey = new TriggerKey($"integration-trigger-{suffix}", "FluentA.Integration");
        var fireAt = DateTimeOffset.UtcNow.AddMinutes(10);

        var first = await BuildSchedulerAsync(connectionString, suffix);
        try
        {
            await first.Start();
            var job = JobBuilder.Create<PersistentProbeJob>()
                .WithIdentity(jobKey)
                .StoreDurably()
                .Build();
            var trigger = TriggerBuilder.Create()
                .WithIdentity(triggerKey)
                .ForJob(jobKey)
                .StartAt(fireAt)
                .WithSimpleSchedule(schedule => schedule
                    .WithMisfireInstruction(SimpleTriggerMisfireInstruction.FireNow))
                .Build();

            await first.ScheduleJob(job, trigger, new ScheduleJobOptions());
        }
        finally
        {
            await first.Shutdown(waitForJobsToComplete: true);
        }

        var second = await BuildSchedulerAsync(connectionString, suffix);
        try
        {
            await second.Start();
            var persisted = await second.GetTrigger(triggerKey);
            Assert.NotNull(persisted);
            Assert.Equal(jobKey, persisted!.JobKey);
            Assert.Equal(fireAt, persisted.StartTimeUtc);
        }
        finally
        {
            await second.DeleteJob(jobKey);
            await second.Shutdown(waitForJobsToComplete: true);
        }
    }

    private static async Task<IScheduler> BuildSchedulerAsync(string connectionString, string suffix)
    {
        return await QuartzSchedulerBuilder.Create(quartz => quartz
                .ConfigureScheduler(options =>
                {
                    options.InstanceName = $"FluentA.Integration.{suffix}";
                    options.GenerateInstanceId = true;
                })
                .UsePersistentStore(store =>
                {
                    store.UsePostgres(connectionString);
                    store.ProvisionSchema();
                }))
            .BuildScheduler();
    }

    private sealed class PersistentProbeJob : IJob
    {
        public ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default) =>
            ValueTask.CompletedTask;
    }

    private sealed class QuartzPostgresFactAttribute : FactAttribute
    {
        public QuartzPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_QUARTZ_VALIDATION_POSTGRES")))
            {
                Skip = "Set FLUENTA_QUARTZ_VALIDATION_POSTGRES to run the isolated persistent Quartz PostgreSQL proof.";
            }
        }
    }

    private sealed class QuartzValidationDatabase : IAsyncDisposable
    {
        private readonly string _adminConnectionString;
        private readonly string _schema;

        private QuartzValidationDatabase(string adminConnectionString, string connectionString, string schema)
        {
            _adminConnectionString = adminConnectionString;
            ConnectionString = connectionString;
            _schema = schema;
        }

        public string ConnectionString { get; }

        public static async Task<QuartzValidationDatabase> CreateAsync()
        {
            var raw = Environment.GetEnvironmentVariable("FLUENTA_QUARTZ_VALIDATION_POSTGRES")
                ?? throw new InvalidOperationException("Quartz PostgreSQL validation connection is missing.");
            var admin = new NpgsqlConnectionStringBuilder(raw);
            const string expectedDatabase = "fluenta-quartz-validation15439";
            if (!string.Equals(admin.Database, expectedDatabase, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"Quartz validation requires database '{expectedDatabase}', but '{admin.Database}' was configured.");
            }

            var schema = $"quartz_test_{Guid.NewGuid():N}";
            await using var connection = new NpgsqlConnection(admin.ConnectionString);
            await connection.OpenAsync();
            await using (var command = connection.CreateCommand())
            {
                command.CommandText = $"CREATE SCHEMA \"{schema}\"";
                await command.ExecuteNonQueryAsync();
            }

            var scoped = new NpgsqlConnectionStringBuilder(admin.ConnectionString)
            {
                SearchPath = schema,
                ApplicationName = "FluentA.QuartzSchedulingTests"
            };
            return new QuartzValidationDatabase(admin.ConnectionString, scoped.ConnectionString, schema);
        }

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
