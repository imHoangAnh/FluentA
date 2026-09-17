using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Quartz;

namespace FluentA.Infrastructure.Scheduling;

/// <summary>
/// Periodically repairs the durable trigger set from current business rows.
/// </summary>
[DisallowConcurrentExecution]
public sealed class QuartzReconciliationJob : IJob
{
    private readonly IServiceScopeFactory _scopeFactory;

    public QuartzReconciliationJob(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    public async ValueTask Execute(IJobExecutionContext context, CancellationToken cancellationToken = default)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var coordinator = scope.ServiceProvider.GetRequiredService<IQuartzScheduleCoordinator>();
        await coordinator.ReconcileAsync(cancellationToken);
    }
}

/// <summary>
/// Performs one reconciliation immediately after the hosted Quartz scheduler
/// has started. The durable periodic trigger remains the repair backstop.
/// </summary>
public sealed class QuartzStartupReconciliationService : IHostedService
{
    private readonly IQuartzScheduleCoordinator _coordinator;

    public QuartzStartupReconciliationService(IQuartzScheduleCoordinator coordinator)
    {
        _coordinator = coordinator;
    }

    public Task StartAsync(CancellationToken cancellationToken) =>
        _coordinator.ReconcileAsync(cancellationToken);

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}
