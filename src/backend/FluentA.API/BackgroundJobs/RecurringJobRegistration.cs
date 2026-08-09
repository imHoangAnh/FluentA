using FluentA.Application.BackgroundJobs;
using FluentA.Infrastructure.BackgroundJobs;
using Hangfire;

namespace FluentA.API.BackgroundJobs;

public static class RecurringJobRegistration
{
    public const string TodoCarryOverId = "todo-carry-over";
    public const string TodoReminderId = "todo-reminders";
    public const string HabitReminderId = "habit-reminders";
    public const string CountdownAlertId = "countdown-alerts";
    public const string CountdownRetirementId = "countdown-retirement";
    public const string CountdownRecurrenceId = "countdown-recurrence";
    public const string PendingAssetCleanupId = "pending-asset-cleanup";
    public const string ArchivedAssetPurgeId = "archived-asset-purge";
    public const string TrashPurgeId = "trash-purge";
    public const string DatabaseCleanupId = "database-cleanup";
    public const string ReviewDueDeferralId = "review-due-deferral";

    public static void Register(IRecurringJobManager jobs)
    {
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            TodoCarryOverId, job => job.CarryOverTodosAsync(CancellationToken.None), "5 0 * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            TodoReminderId, job => job.ProcessTodoRemindersAsync(CancellationToken.None), "* * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            HabitReminderId, job => job.SendHabitRemindersAsync(CancellationToken.None), "* * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            CountdownAlertId, job => job.ProcessCountdownAlertsAsync(CancellationToken.None), "*/5 * * * *");
        jobs.RemoveIfExists(CountdownRetirementId);
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            CountdownRecurrenceId,
            job => job.AdvanceCountdownRecurrencesAsync(CancellationToken.None),
            "10 0 * * *",
            new RecurringJobOptions { TimeZone = ResolveVietnamTimeZone() });
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            PendingAssetCleanupId, job => job.CleanupExpiredPendingAssetsAsync(CancellationToken.None), "15 * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            ArchivedAssetPurgeId, job => job.PurgeExpiredArchivedAssetsAsync(CancellationToken.None), "30 * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            TrashPurgeId, job => job.PurgeExpiredTrashAsync(CancellationToken.None), "*/5 * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            DatabaseCleanupId, job => job.CleanupDeletedRecordsAsync(CancellationToken.None), "0 2 * * 0");
        jobs.AddOrUpdate<ReviewDueDeferralJob>(
            ReviewDueDeferralId,
            job => job.ExecuteAsync(null, CancellationToken.None),
            "55 23 * * *",
            new RecurringJobOptions { TimeZone = ResolveVietnamTimeZone() });
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
}
