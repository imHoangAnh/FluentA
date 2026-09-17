using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Quartz;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>
/// Dispatches a persisted one-shot occurrence to the business adapter.
/// </summary>
public sealed class QuartzOccurrenceDispatchJob : IJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QuartzOccurrenceDispatchJob> _logger;

    public QuartzOccurrenceDispatchJob(
        IServiceScopeFactory scopeFactory,
        ILogger<QuartzOccurrenceDispatchJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        var occurrence = QuartzJobData.ReadOccurrence(context.MergedJobDataMap);
        await using var scope = _scopeFactory.CreateAsyncScope();
        var executor = scope.ServiceProvider.GetRequiredService<IScheduledOccurrenceExecutor>();

        _logger.LogDebug(
            "Dispatching Quartz {Kind} occurrence {SourceId} at {ScheduledAtUtc} with revision {Revision}.",
            occurrence.Kind,
            occurrence.SourceId,
            occurrence.ScheduledAtUtcNormalized,
            occurrence.Revision);

        _logger.LogInformation("Quartz occurrence {Kind}/{SourceId} dispatch lag {LagMilliseconds} ms.",
            occurrence.Kind, occurrence.SourceId,
            Math.Max(0, (DateTime.UtcNow - occurrence.ScheduledAtUtcNormalized).TotalMilliseconds));

        await executor.ExecuteAsync(occurrence, cancellationToken);
    }
}

/// <summary>
/// Dispatches a persisted recurring maintenance trigger to the business adapter.
/// </summary>
public sealed class QuartzMaintenanceDispatchJob : IJob
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<QuartzMaintenanceDispatchJob> _logger;

    public QuartzMaintenanceDispatchJob(
        IServiceScopeFactory scopeFactory,
        ILogger<QuartzMaintenanceDispatchJob> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        var kind = QuartzJobData.ReadMaintenanceKind(context.MergedJobDataMap);
        var maintenance = new ScheduledMaintenance(
            kind,
            context.FireTimeUtc.UtcDateTime);

        await using var scope = _scopeFactory.CreateAsyncScope();
        var executor = scope.ServiceProvider.GetRequiredService<IScheduledMaintenanceExecutor>();

        _logger.LogDebug(
            "Dispatching Quartz maintenance {Kind} at {ScheduledAtUtc}.",
            maintenance.Kind,
            maintenance.ScheduledAtUtc);

        await executor.ExecuteAsync(maintenance, cancellationToken);
    }
}
