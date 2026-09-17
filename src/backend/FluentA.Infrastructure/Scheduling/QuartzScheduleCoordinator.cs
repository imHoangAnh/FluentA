using FluentA.Infrastructure.Persistence;
using FluentA.Infrastructure.BackgroundJobs;
using FluentA.Domain.BoundedContexts.Countdown.Enums;
using FluentA.Domain.BoundedContexts.Countdown.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Quartz;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>
/// Rebuilds the Quartz occurrence set from the business database and performs
/// idempotent trigger upserts. PostgreSQL Quartz state is durable, but the
/// business write and scheduler write are deliberately separate operations;
/// startup and periodic reconciliation close that gap.
/// </summary>
public sealed class QuartzScheduleCoordinator : IQuartzScheduleCoordinator
{
    private static readonly TimeZoneInfo VietnamTimeZone = ResolveVietnamTimeZone();
    private readonly ISchedulerFactory _schedulerFactory;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QuartzScheduleCoordinator> _logger;
    private readonly SemaphoreSlim _operationGate = new(1, 1);

    public QuartzScheduleCoordinator(
        ISchedulerFactory schedulerFactory,
        IServiceScopeFactory scopeFactory,
        ILogger<QuartzScheduleCoordinator> logger)
    {
        _schedulerFactory = schedulerFactory;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async Task ReconcileAsync(CancellationToken cancellationToken = default)
    {
        await _operationGate.WaitAsync(cancellationToken);
        try
        {
            var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
            await using var scope = _scopeFactory.CreateAsyncScope();
            var maintenanceExecutor = scope.ServiceProvider.GetRequiredService<IScheduledMaintenanceExecutor>();
            await maintenanceExecutor.ExecuteAsync(
                new ScheduledMaintenance(
                    ScheduledMaintenanceKind.CountdownRecurrence,
                    DateTime.UtcNow),
                cancellationToken);
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var occurrences = await LoadOccurrencesAsync(dbContext, DateTime.UtcNow, cancellationToken);
            var expectedKeys = occurrences
                .Select(QuartzScheduleIdentity.OccurrenceTriggerKey)
                .ToHashSet();

            foreach (var occurrence in occurrences)
            {
                await UpsertOccurrenceAsync(scheduler, occurrence, cancellationToken);
            }

            var persistedKeys = await scheduler.GetTriggerKeys(
                GroupMatcher<TriggerKey>.GroupEquals(QuartzScheduleIdentity.OccurrenceGroup),
                cancellationToken);
            foreach (var persistedKey in persistedKeys.Where(key => !expectedKeys.Contains(key)))
            {
                await scheduler.UnscheduleJob(persistedKey, cancellationToken);
            }

            var staleCount = persistedKeys.Count(key => !expectedKeys.Contains(key));
            _logger.LogInformation(
                "Quartz occurrence reconciliation scheduled {ExpectedCount} occurrences and removed {RemovedCount} stale triggers.",
                occurrences.Count,
                staleCount);
        }
        finally
        {
            _operationGate.Release();
        }
    }

    public async Task UpsertOccurrenceAsync(
        ScheduledOccurrence occurrence,
        CancellationToken cancellationToken = default)
    {
        ValidateOccurrence(occurrence);
        await _operationGate.WaitAsync(cancellationToken);
        try
        {
            var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
            await UpsertOccurrenceAsync(scheduler, occurrence, cancellationToken);
        }
        finally
        {
            _operationGate.Release();
        }
    }

    public async Task UnscheduleOccurrenceAsync(
        ScheduledOccurrence occurrence,
        CancellationToken cancellationToken = default)
    {
        ValidateOccurrence(occurrence);
        await _operationGate.WaitAsync(cancellationToken);
        try
        {
            var scheduler = await _schedulerFactory.GetScheduler(cancellationToken);
            await scheduler.UnscheduleJob(
                QuartzScheduleIdentity.OccurrenceTriggerKey(occurrence),
                cancellationToken);
        }
        finally
        {
            _operationGate.Release();
        }
    }

    private static async Task UpsertOccurrenceAsync(
        IScheduler scheduler,
        ScheduledOccurrence occurrence,
        CancellationToken cancellationToken)
    {
        var trigger = TriggerBuilder.Create()
            .WithIdentity(QuartzScheduleIdentity.OccurrenceTriggerKey(occurrence))
            .ForJob(QuartzScheduleIdentity.OccurrenceJobKey)
            .UsingJobData(QuartzJobData.ForOccurrence(occurrence))
            .StartAt(new DateTimeOffset(occurrence.ScheduledAtUtcNormalized))
            .WithSimpleSchedule(schedule => schedule
                .WithMisfireInstruction(SimpleTriggerMisfireInstruction.FireNow))
            .WithRetryPolicy(RetryPolicy.Fixed(3, TimeSpan.FromSeconds(10)))
            .Build();

        // The trigger key contains the complete scheduling tuple and revision.
        // Leave an unchanged trigger untouched so reconciliation cannot reset
        // an in-flight one-shot trigger or its misfire state. A concurrent
        // reconciler may win the insert race; that is already the desired
        // idempotent result.
        if (await scheduler.GetTrigger(trigger.Key, cancellationToken) is not null)
        {
            return;
        }

        try
        {
            await scheduler.ScheduleJob(trigger, new ScheduleJobOptions(), cancellationToken);
        }
        catch (ObjectAlreadyExistsException)
        {
            // Another process inserted the same deterministic trigger.
        }
    }

    private static async Task<List<ScheduledOccurrence>> LoadOccurrencesAsync(
        AppDbContext dbContext,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var occurrences = new List<ScheduledOccurrence>();

        var todos = await dbContext.TodoItems
            .AsNoTracking()
            .Where(item => item.DeletedAt == null
                && !item.IsCompleted
                && item.ReminderScheduledAtUtc != null
                && item.ReminderSentAtUtc == null)
            .ToListAsync(cancellationToken);
        occurrences.AddRange(todos.Select(item => new ScheduledOccurrence(
            ScheduledOccurrenceKind.TodoReminder,
            item.Id,
            NormalizeDateOnly(item.Date),
            NormalizeUtc(item.ReminderScheduledAtUtc!.Value),
            Revision(item.UpdatedAt))));

        var localNow = TimeZoneInfo.ConvertTimeFromUtc(nowUtc, VietnamTimeZone);
        var today = NormalizeDateOnly(localNow.Date);
        var tomorrow = today.AddDays(1);
        var habits = await dbContext.Habits
            .AsNoTracking()
            .Where(habit => habit.DeletedAt == null
                && habit.ReminderEnabled)
            .ToListAsync(cancellationToken);

        var todayCompletedHabitIds = (await dbContext.HabitEntries
                .AsNoTracking()
                .Where(entry => entry.DeletedAt == null && entry.Date == today)
                .Select(entry => entry.HabitId)
                .ToListAsync(cancellationToken))
            .ToHashSet();
        var entryCounts = await dbContext.HabitEntries
            .AsNoTracking()
            .Where(entry => entry.DeletedAt == null)
            .GroupBy(entry => entry.HabitId)
            .Select(group => new { HabitId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.HabitId, item => item.Count, cancellationToken);

        foreach (var (habit, occurrenceDate) in habits
            .SelectMany(habit => new[] { (Habit: habit, Date: today), (Habit: habit, Date: tomorrow) })
            .Where(candidate => candidate.Habit.IsEligibleOn(candidate.Date)
                && (candidate.Date != today || !todayCompletedHabitIds.Contains(candidate.Habit.Id))
                && (!candidate.Habit.GoalDays.HasValue
                    || !entryCounts.TryGetValue(candidate.Habit.Id, out var count)
                    || count < candidate.Habit.GoalDays.Value)
                && (candidate.Date != today || candidate.Habit.LastReminderSentOn != today)))
        {
            var localReminder = DateTime.SpecifyKind(
                occurrenceDate.Date.Add(habit.ReminderTime.ToTimeSpan()),
                DateTimeKind.Unspecified);
            var scheduledAtUtc = TimeZoneInfo.ConvertTimeToUtc(localReminder, VietnamTimeZone);
            occurrences.Add(new ScheduledOccurrence(
                ScheduledOccurrenceKind.HabitReminder,
                habit.Id,
                occurrenceDate,
                scheduledAtUtc,
                Revision(habit.UpdatedAt)));
        }

        var alerts = await dbContext.CountdownAlerts
            .AsNoTracking()
            .Where(alert => alert.DeletedAt == null)
            .ToListAsync(cancellationToken);
        if (alerts.Count > 0)
        {
            var countdownIds = alerts.Select(alert => alert.CountdownId).Distinct().ToArray();
            var countdowns = await dbContext.CountdownEvents
                .AsNoTracking()
                .Where(countdown => countdown.DeletedAt == null && countdownIds.Contains(countdown.Id))
                .ToDictionaryAsync(countdown => countdown.Id, cancellationToken);
            var countdownOccurrences = new List<(ScheduledOccurrence Occurrence, string DeduplicationKey)>();
            foreach (var alert in alerts)
            {
                if (!countdowns.TryGetValue(alert.CountdownId, out var countdown)
                    || countdown.TargetDate.Date < today.Date)
                {
                    // A delayed countdown occurrence is eligible only through
                    // the end of its target Vietnam day. Recurrence maintenance
                    // will advance a repeating parent before the next repair.
                    continue;
                }

                void AddOccurrence(DateTime target, DateTime scheduledAt)
                {
                    countdownOccurrences.Add((new ScheduledOccurrence(
                        ScheduledOccurrenceKind.CountdownAlert, alert.Id,
                        NormalizeDateOnly(target), NormalizeUtc(scheduledAt), Revision(alert.UpdatedAt)),
                        ScheduledProductivityJobKeys.CountdownAlert(countdown.Id, target, alert.Id)));
                }

                if (alert.FiredAtUtc is null)
                    AddOccurrence(countdown.TargetDate, alert.ScheduledAtUtc);

                // A weekly reminder seven days before its next target is due
                // on the current target day. Prepare it before advancing the
                // displayed target; also avoid a midnight reconciliation delay.
                if (countdown.RepeatPattern != CountdownRepeatPattern.None)
                {
                    var nextTarget = CountdownSchedule.NextTargetDate(countdown.TargetDate,
                        countdown.RepeatPattern, countdown.TargetDate.AddDays(1));
                    AddOccurrence(nextTarget, CountdownSchedule.BuildAlertScheduledAtUtc(
                        nextTarget, alert.AlertDay, alert.AlertTime));
                }
            }

            var candidateKeys = countdownOccurrences.Select(candidate => candidate.DeduplicationKey).ToArray();
            var deliveredKeys = (await dbContext.Notifications.AsNoTracking()
                .Where(notification => candidateKeys.Contains(notification.DeduplicationKey))
                .Select(notification => notification.DeduplicationKey)
                .ToListAsync(cancellationToken)).ToHashSet();
            occurrences.AddRange(countdownOccurrences
                .Where(candidate => !deliveredKeys.Contains(candidate.DeduplicationKey))
                .Select(candidate => candidate.Occurrence));
        }

        return occurrences;
    }

    private static void ValidateOccurrence(ScheduledOccurrence occurrence)
    {
        if (occurrence.SourceId == Guid.Empty
            || occurrence.Revision < 0
            || occurrence.ScheduledAtUtc.Kind != DateTimeKind.Utc
            || !Enum.IsDefined(occurrence.Kind))
        {
            throw new ArgumentException("A scheduled occurrence must contain a valid UTC instant and source id.", nameof(occurrence));
        }
    }

    private static long Revision(DateTime updatedAt) =>
        NormalizeUtc(updatedAt).Ticks;

    private static DateTime NormalizeUtc(DateTime value) =>
        value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc),
        };

    private static DateTime NormalizeDateOnly(DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

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
}
