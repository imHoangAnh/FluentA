using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Countdown.Entities;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Services;
using FluentA.Domain.BoundedContexts.Habit.Enums;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Domain.BoundedContexts.Todo.Entities;
using FluentA.Infrastructure.BackgroundJobs;
using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.Scheduling;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Npgsql;
using CountdownEvent = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.UnitTests;

/// <summary>
/// PostgreSQL business proof for the Quartz occurrence adapter.
///
/// These tests intentionally do not use the normal development database.  Set
/// FLUENTA_QUARTZ_VALIDATION_POSTGRES to the isolated
/// fluenta-quartz-validation15439 connection before running this class.
/// </summary>
public sealed class ScheduledProductivityExecutionIntegrationTests
{
    [ScheduledProductivityPostgresFact]
    public async Task Todo_reminder_rejects_a_stale_trigger_without_sending()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "stale-todo");
            var scheduledAtUtc = Utc(2026, 1, 15, 2, 0);
            var todo = TodoItem.Create(
                user.Id,
                "Stale reminder",
                Utc(2026, 1, 15),
                note: null,
                reminderTime: new TimeOnly(9, 0),
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: scheduledAtUtc);
            seed.TodoItems.Add(todo);
            await seed.SaveChangesAsync();

            await using var executionContext = database.CreateContext();
            var execution = CreateExecution(executionContext);
            await execution.ExecuteTodoReminderAsync(
                todo.Id,
                scheduledAtUtc.AddMinutes(1),
                nowUtc: scheduledAtUtc.AddMinutes(2));
        }

        await using var verify = database.CreateContext();
        Assert.Empty(await verify.Notifications.ToListAsync());
        var persisted = await verify.TodoItems.SingleAsync();
        Assert.Null(persisted.ReminderSentAtUtc);
    }

    [ScheduledProductivityPostgresFact]
    public async Task Due_incomplete_todo_is_caught_up_but_completed_and_deleted_todos_are_skipped()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var scheduledAtUtc = Utc(2026, 1, 15, 2, 0);
        var catchupNowUtc = Utc(2026, 1, 16, 2, 0);

        Guid incompleteId;
        Guid completedId;
        Guid deletedId;
        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "todo-eligibility");
            var incomplete = TodoItem.Create(
                user.Id,
                "Catch up this reminder",
                Utc(2026, 1, 15),
                note: null,
                reminderTime: new TimeOnly(9, 0),
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: scheduledAtUtc);
            var completed = TodoItem.Create(
                user.Id,
                "Completed reminder",
                Utc(2026, 1, 15),
                note: null,
                reminderTime: new TimeOnly(9, 0),
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: scheduledAtUtc);
            completed.SetCompleted(true, catchupNowUtc);
            var deleted = TodoItem.Create(
                user.Id,
                "Deleted reminder",
                Utc(2026, 1, 15),
                note: null,
                reminderTime: new TimeOnly(9, 0),
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: scheduledAtUtc);
            deleted.SoftDelete(catchupNowUtc);

            seed.TodoItems.AddRange(incomplete, completed, deleted);
            await seed.SaveChangesAsync();
            incompleteId = incomplete.Id;
            completedId = completed.Id;
            deletedId = deleted.Id;
        }

        await using (var executionContext = database.CreateContext())
        {
            var execution = CreateExecution(executionContext);
            await execution.ExecuteTodoReminderAsync(incompleteId, scheduledAtUtc, catchupNowUtc);
            await execution.ExecuteTodoReminderAsync(completedId, scheduledAtUtc, catchupNowUtc);
            await execution.ExecuteTodoReminderAsync(deletedId, scheduledAtUtc, catchupNowUtc);
        }

        await using var verify = database.CreateContext();
        var notifications = await verify.Notifications.ToListAsync();
        Assert.Single(notifications);
        Assert.Equal("TodoReminder", notifications[0].Type);

        var persistedIncomplete = await verify.TodoItems.SingleAsync(item => item.Id == incompleteId);
        var persistedCompleted = await verify.TodoItems.SingleAsync(item => item.Id == completedId);
        var persistedDeleted = await verify.TodoItems.SingleAsync(item => item.Id == deletedId);
        Assert.NotNull(persistedIncomplete.ReminderSentAtUtc);
        Assert.Null(persistedCompleted.ReminderSentAtUtc);
        Assert.Null(persistedDeleted.ReminderSentAtUtc);
    }

    [ScheduledProductivityPostgresFact]
    public async Task Concurrent_due_todo_dispatches_create_one_notification_and_one_claim()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var scheduledAtUtc = Utc(2026, 1, 15, 2, 0);
        var nowUtc = scheduledAtUtc.AddMinutes(1);
        Guid todoId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "todo-concurrency");
            var todo = TodoItem.Create(
                user.Id,
                "Only once",
                Utc(2026, 1, 15),
                note: null,
                reminderTime: new TimeOnly(9, 0),
                reminderTimeZoneId: "Asia/Ho_Chi_Minh",
                reminderScheduledAtUtc: scheduledAtUtc);
            seed.TodoItems.Add(todo);
            await seed.SaveChangesAsync();
            todoId = todo.Id;
        }

        async Task DispatchAsync()
        {
            await using var context = database.CreateContext();
            var execution = CreateExecution(context);
            await execution.ExecuteTodoReminderAsync(todoId, scheduledAtUtc, nowUtc);
        }

        await Task.WhenAll(DispatchAsync(), DispatchAsync());

        await using var verify = database.CreateContext();
        Assert.Single(await verify.Notifications.ToListAsync());
        Assert.NotNull((await verify.TodoItems.SingleAsync()).ReminderSentAtUtc);
    }

    [ScheduledProductivityPostgresFact]
    public async Task Habit_yesterday_is_skipped_today_sends_when_eligible_and_duplicate_is_suppressed()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var yesterday = Utc(2026, 1, 15);
        var today = Utc(2026, 1, 16);
        var yesterdayScheduledAtUtc = Utc(2026, 1, 15, 13, 0);
        var todayScheduledAtUtc = Utc(2026, 1, 16, 13, 0);
        var nowUtc = Utc(2026, 1, 16, 13, 1);
        Guid habitId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "habit-eligibility");
            var habit = Habit.Create(
                user.Id,
                "Daily check-in",
                description: null,
                icon: HabitIcon.Default,
                frequency: HabitFrequency.Daily,
                customDays: null,
                startDate: Utc(2026, 1, 1),
                goalDays: null,
                reminderTime: new TimeOnly(20, 0));
            seed.Habits.Add(habit);
            await seed.SaveChangesAsync();
            habitId = habit.Id;
        }

        await using (var yesterdayContext = database.CreateContext())
        {
            var execution = CreateExecution(yesterdayContext);
            await execution.ExecuteHabitReminderAsync(
                habitId,
                yesterday,
                yesterdayScheduledAtUtc,
                nowUtc);
        }

        await using (var todayContext = database.CreateContext())
        {
            var execution = CreateExecution(todayContext);
            await execution.ExecuteHabitReminderAsync(
                habitId,
                today,
                todayScheduledAtUtc,
                nowUtc);
        }

        await using (var duplicateContext = database.CreateContext())
        {
            var execution = CreateExecution(duplicateContext);
            await execution.ExecuteHabitReminderAsync(
                habitId,
                today,
                todayScheduledAtUtc,
                nowUtc);
        }

        await using var verify = database.CreateContext();
        var notifications = await verify.Notifications.ToListAsync();
        Assert.Single(notifications);
        Assert.Equal("HabitReminder", notifications[0].Type);
        Assert.Equal(today, (await verify.Habits.SingleAsync()).LastReminderSentOn);
        Assert.Empty(await verify.HabitEntries.ToListAsync());
    }

    [ScheduledProductivityPostgresFact]
    public async Task Countdown_skips_expired_and_stale_targets_but_allows_current_target_once()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var expiredTarget = Utc(2026, 1, 15);
        var currentTarget = Utc(2026, 1, 16);
        var staleTarget = Utc(2026, 1, 17);
        var expiredScheduledAtUtc = Utc(2026, 1, 15, 3, 0);
        var currentScheduledAtUtc = Utc(2026, 1, 16, 3, 0);
        var staleScheduledAtUtc = Utc(2026, 1, 17, 3, 0);
        var expiredNowUtc = Utc(2026, 1, 16, 4, 0);
        var currentNowUtc = Utc(2026, 1, 16, 4, 0);
        var staleNowUtc = Utc(2026, 1, 17, 4, 0);
        Guid expiredCountdownId;
        Guid expiredAlertId;
        Guid currentCountdownId;
        Guid currentAlertId;
        Guid staleCountdownId;
        Guid staleAlertId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "countdown-eligibility");

            var expired = CountdownEvent.Create(user.Id, "Expired", expiredTarget);
            expired.AddAlert("OnTargetDay", "10:00", expiredScheduledAtUtc);
            var current = CountdownEvent.Create(user.Id, "Current", currentTarget);
            current.AddAlert("OnTargetDay", "10:00", currentScheduledAtUtc);
            var stale = CountdownEvent.Create(user.Id, "Stale target", staleTarget);
            stale.AddAlert("OnTargetDay", "10:00", staleScheduledAtUtc);
            seed.CountdownEvents.AddRange(expired, current, stale);
            await seed.SaveChangesAsync();

            expiredCountdownId = expired.Id;
            expiredAlertId = expired.Alerts.Single().Id;
            currentCountdownId = current.Id;
            currentAlertId = current.Alerts.Single().Id;
            staleCountdownId = stale.Id;
            staleAlertId = stale.Alerts.Single().Id;
        }

        await using (var expiredContext = database.CreateContext())
        {
            var execution = CreateExecution(expiredContext);
            await execution.ExecuteCountdownAlertAsync(
                expiredCountdownId,
                expiredAlertId,
                expiredTarget,
                expiredScheduledAtUtc,
                expiredNowUtc);
        }

        await using (var currentContext = database.CreateContext())
        {
            var execution = CreateExecution(currentContext);
            await execution.ExecuteCountdownAlertAsync(
                currentCountdownId,
                currentAlertId,
                currentTarget,
                currentScheduledAtUtc,
                currentNowUtc);
        }

        await using (var duplicateContext = database.CreateContext())
        {
            var execution = CreateExecution(duplicateContext);
            await execution.ExecuteCountdownAlertAsync(
                currentCountdownId,
                currentAlertId,
                currentTarget,
                currentScheduledAtUtc,
                currentNowUtc);
        }

        await using (var staleContext = database.CreateContext())
        {
            var execution = CreateExecution(staleContext);
            await execution.ExecuteCountdownAlertAsync(
                staleCountdownId,
                staleAlertId,
                currentTarget,
                staleScheduledAtUtc,
                staleNowUtc);
        }

        await using var verify = database.CreateContext();
        Assert.Single(await verify.Notifications.ToListAsync());
        Assert.Null((await verify.CountdownAlerts.SingleAsync(alert => alert.Id == expiredAlertId)).FiredAtUtc);
        Assert.NotNull((await verify.CountdownAlerts.SingleAsync(alert => alert.Id == currentAlertId)).FiredAtUtc);
        Assert.Null((await verify.CountdownAlerts.SingleAsync(alert => alert.Id == staleAlertId)).FiredAtUtc);
    }

    [ScheduledProductivityPostgresFact]
    public async Task Countdown_recurrence_advances_parent_and_alert_schedule_together()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var nowUtc = DateTime.UtcNow;
        var vietnamTimeZone = ResolveVietnamTimeZone();
        var vietnamToday = DateTime.SpecifyKind(
            TimeZoneInfo.ConvertTimeFromUtc(nowUtc, vietnamTimeZone).Date,
            DateTimeKind.Utc);
        var previousTarget = vietnamToday.AddDays(-7);
        var oldScheduledAtUtc = CountdownSchedule.BuildAlertScheduledAtUtc(
            previousTarget,
            "OnTargetDay",
            "10:00");
        Guid countdownId;
        Guid alertId;

        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "countdown-recurrence");
            var countdown = CountdownEvent.Create(
                user.Id,
                "Weekly recurrence",
                previousTarget,
                repeatPattern: CountdownRepeatPattern.Weekly);
            countdown.AddAlert("OnTargetDay", "10:00", oldScheduledAtUtc);
            seed.CountdownEvents.Add(countdown);
            await seed.SaveChangesAsync();
            countdownId = countdown.Id;
            alertId = countdown.Alerts.Single().Id;
        }

        await using (var executionContext = database.CreateContext())
        {
            var maintenance = new ScheduledMaintenanceJobs(
                assetService: null!,
                trashService: null!,
                logger: NullLogger<ScheduledMaintenanceJobs>.Instance);
            var jobs = new ScheduledProductivityJobs(
                executionContext,
                NullLogger<ScheduledProductivityJobs>.Instance,
                maintenance);
            await jobs.AdvanceCountdownRecurrencesAsync();
        }

        await using var verify = database.CreateContext();
        var persisted = await verify.CountdownEvents.SingleAsync(item => item.Id == countdownId);
        var persistedAlert = await verify.CountdownAlerts.SingleAsync(alert => alert.Id == alertId);
        Assert.Equal(vietnamToday, persisted.TargetDate);
        Assert.Equal(
            CountdownSchedule.BuildAlertScheduledAtUtc(vietnamToday, "OnTargetDay", "10:00"),
            persistedAlert.ScheduledAtUtc);
        Assert.Null(persistedAlert.FiredAtUtc);
    }

    [ScheduledProductivityPostgresFact]
    public async Task Weekly_seven_day_advance_alert_sends_next_cycle_without_consuming_current_cycle_or_replaying_after_advance()
    {
        await using var database = await ScheduledProductivityDatabase.CreateAsync();
        var today = DateTime.SpecifyKind(TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, ResolveVietnamTimeZone()).Date,
            DateTimeKind.Utc);
        var currentTarget = today.AddDays(-1);
        var nextTarget = currentTarget.AddDays(7);
        var currentAt = CountdownSchedule.BuildAlertScheduledAtUtc(currentTarget, "7DaysBefore", "00:00");
        var nextAt = CountdownSchedule.BuildAlertScheduledAtUtc(nextTarget, "7DaysBefore", "00:00");
        Guid countdownId;
        Guid alertId;
        await using (var seed = database.CreateContext())
        {
            var user = AddUser(seed, "countdown-overlap");
            var countdown = CountdownEvent.Create(user.Id, "Weekly overlap", currentTarget,
                repeatPattern: CountdownRepeatPattern.Weekly);
            countdown.AddAlert("7DaysBefore", "00:00", currentAt);
            seed.CountdownEvents.Add(countdown);
            await seed.SaveChangesAsync();
            countdownId = countdown.Id;
            alertId = countdown.Alerts.Single().Id;
        }

        // The next cycle's reminder is due while the previous target is still
        // displayed. Two concurrent deliveries claim exactly that next cycle.
        async Task DispatchNext()
        {
            await using var context = database.CreateContext();
            await CreateExecution(context).ExecuteCountdownAlertAsync(countdownId, alertId,
                nextTarget, nextAt, nextAt);
        }
        await Task.WhenAll(DispatchNext(), DispatchNext());
        await using (var verify = database.CreateContext())
        {
            Assert.Single(await verify.Notifications.ToListAsync());
            Assert.Equal(currentTarget, (await verify.CountdownEvents.SingleAsync()).TargetDate);
            Assert.Null((await verify.CountdownAlerts.SingleAsync()).FiredAtUtc);
        }

        // Delivery for the old target remains independent, including its marker.
        await using (var context = database.CreateContext())
            await CreateExecution(context).ExecuteCountdownAlertAsync(countdownId, alertId,
                currentTarget, currentAt, nextAt);

        await using (var context = database.CreateContext())
        {
            var jobs = new ScheduledProductivityJobs(context, NullLogger<ScheduledProductivityJobs>.Instance,
                new ScheduledMaintenanceJobs(null!, null!, NullLogger<ScheduledMaintenanceJobs>.Instance));
            await jobs.AdvanceCountdownRecurrencesAsync();
        }
        await DispatchNext();
        await using (var verify = database.CreateContext())
        {
            Assert.Equal(2, await verify.Notifications.CountAsync());
            Assert.Equal(nextTarget, (await verify.CountdownEvents.SingleAsync()).TargetDate);
            Assert.NotNull((await verify.CountdownAlerts.SingleAsync()).FiredAtUtc);
        }
    }

    private static ScheduledProductivityExecution CreateExecution(AppDbContext context) =>
        new(context, NullLogger<ScheduledProductivityExecution>.Instance);

    private static User AddUser(AppDbContext context, string prefix)
    {
        var user = User.CreateWithPassword(
            $"{prefix}-{Guid.NewGuid():N}@example.test",
            "Scheduled productivity test",
            "test-password-hash");
        context.Users.Add(user);
        return user;
    }

    private static DateTime Utc(int year, int month, int day, int hour = 0, int minute = 0) =>
        new(year, month, day, hour, minute, 0, DateTimeKind.Utc);

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

    private sealed class ScheduledProductivityPostgresFactAttribute : FactAttribute
    {
        public ScheduledProductivityPostgresFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(ScheduledProductivityDatabase.RawConnectionString))
            {
                Skip = "Set FLUENTA_QUARTZ_VALIDATION_POSTGRES to run the isolated PostgreSQL business proof.";
            }
        }
    }

    private sealed class ScheduledProductivityDatabase : IAsyncDisposable
    {
        private const string ConnectionEnvironmentVariable = "FLUENTA_QUARTZ_VALIDATION_POSTGRES";
        private const string RequiredDatabaseName = "fluenta-quartz-validation15439";

        private readonly string _adminConnectionString;
        private readonly string _schema;

        private ScheduledProductivityDatabase(
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

        public static async Task<ScheduledProductivityDatabase> CreateAsync()
        {
            var rawConnectionString = RawConnectionString;
            if (string.IsNullOrWhiteSpace(rawConnectionString))
            {
                throw new InvalidOperationException(
                    $"{ConnectionEnvironmentVariable} is required for the isolated PostgreSQL business proof.");
            }

            var baseBuilder = new NpgsqlConnectionStringBuilder(rawConnectionString);
            if (!string.Equals(baseBuilder.Database, RequiredDatabaseName, StringComparison.Ordinal))
            {
                throw new InvalidOperationException(
                    $"The scheduled-productivity proof only accepts database {RequiredDatabaseName}; refusing another database.");
            }

            if (string.Equals(baseBuilder.Database, "hcd_local", StringComparison.OrdinalIgnoreCase)
                || (baseBuilder.Port == 5432
                    && (baseBuilder.Host?.Contains("hcd_local", StringComparison.OrdinalIgnoreCase) ?? false)))
            {
                throw new InvalidOperationException(
                    "The scheduled-productivity proof refuses the hcd_local:5432 database.");
            }

            var schema = $"sched_test_{Guid.NewGuid():N}";
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
                ApplicationName = "FluentA.ScheduledProductivityTests"
            };
            var scopedConnectionString = scopedBuilder.ConnectionString;
            var database = new ScheduledProductivityDatabase(
                baseBuilder.ConnectionString,
                scopedConnectionString,
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
