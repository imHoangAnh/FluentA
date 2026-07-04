using Hangfire;
using Hangfire.Common;
using FluentA.Application.BackgroundJobs;
using FluentA.Infrastructure.BackgroundJobs;

namespace FluentA.Application.UnitTests;

public sealed class RecurringJobRegistrationTests
{
    [Fact]
    public void Register_AddsStableRecurringJobs()
    {
        var manager = new CapturingRecurringJobManager();

        RecurringJobRegistration.Register(manager);

        Assert.Collection(
            manager.RegisteredJobs,
            job => AssertJob(job, RecurringJobRegistration.TodoCarryOverId, "CarryOverTodosAsync", "5 0 * * *"),
            job => AssertJob(job, RecurringJobRegistration.HabitReminderId, "SendHabitRemindersAsync", "0 20 * * *"),
            job => AssertJob(job, RecurringJobRegistration.CountdownAlertId, "ProcessCountdownAlertsAsync", "*/5 * * * *"),
            job => AssertJob(job, RecurringJobRegistration.PendingAssetCleanupId, "CleanupExpiredPendingAssetsAsync", "15 * * * *"),
            job => AssertJob(job, RecurringJobRegistration.DatabaseCleanupId, "CleanupDeletedRecordsAsync", "0 2 * * 0"));
    }

    private static void AssertJob(RegisteredJob actual, string id, string methodName, string cron)
    {
        Assert.Equal(id, actual.Id);
        Assert.Equal(typeof(IScheduledProductivityJobs), actual.Job.Type);
        Assert.Equal(methodName, actual.Job.Method.Name);
        Assert.Equal(cron, actual.Cron);
    }

    private sealed class CapturingRecurringJobManager : IRecurringJobManager
    {
        public List<RegisteredJob> RegisteredJobs { get; } = [];

        public void AddOrUpdate(string recurringJobId, Job job, string cronExpression, RecurringJobOptions options)
        {
            RegisteredJobs.Add(new RegisteredJob(recurringJobId, job, cronExpression));
        }

        public void Trigger(string recurringJobId)
        {
            throw new NotSupportedException();
        }

        public void RemoveIfExists(string recurringJobId)
        {
            throw new NotSupportedException();
        }
    }

    private sealed record RegisteredJob(string Id, Job Job, string Cron);
}
