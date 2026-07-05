using FluentA.Application.BackgroundJobs;
using Hangfire;

namespace FluentA.Infrastructure.BackgroundJobs;

public static class RecurringJobRegistration
{
    public const string TodoCarryOverId = "todo-carry-over";
    public const string HabitReminderId = "habit-reminders";
    public const string CountdownAlertId = "countdown-alerts";
    public const string PendingAssetCleanupId = "pending-asset-cleanup";
    public const string DatabaseCleanupId = "database-cleanup";

    public static void Register(IRecurringJobManager jobs)
    {
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            TodoCarryOverId, job => job.CarryOverTodosAsync(CancellationToken.None), "5 0 * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            HabitReminderId, job => job.SendHabitRemindersAsync(CancellationToken.None), "0 20 * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            CountdownAlertId, job => job.ProcessCountdownAlertsAsync(CancellationToken.None), "*/5 * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            PendingAssetCleanupId, job => job.CleanupExpiredPendingAssetsAsync(CancellationToken.None), "15 * * * *");
        jobs.AddOrUpdate<IScheduledProductivityJobs>(
            DatabaseCleanupId, job => job.CleanupDeletedRecordsAsync(CancellationToken.None), "0 2 * * 0");
    }
}
