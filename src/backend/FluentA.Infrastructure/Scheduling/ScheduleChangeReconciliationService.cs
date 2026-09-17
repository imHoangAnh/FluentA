using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Scheduling;

public sealed class ScheduleChangeReconciliationService(
    ScheduleChangeSignal signal,
    IQuartzScheduleCoordinator coordinator,
    ILogger<ScheduleChangeReconciliationService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await signal.WaitAsync(stoppingToken);
                await coordinator.ReconcileAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(exception, "Quartz synchronization after a committed change failed; periodic reconciliation will retry.");
            }
        }
    }
}
