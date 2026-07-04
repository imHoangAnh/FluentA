using FluentA.Infrastructure;
using FluentA.Infrastructure.BackgroundJobs;
using Hangfire;

public sealed class HangfireWorkerHostedService : BackgroundService
{
    private static readonly TimeSpan RetryDelay = TimeSpan.FromSeconds(10);

    private readonly IServiceProvider _services;
    private readonly HangfireWorkerOptions _options;
    private readonly ILogger<HangfireWorkerHostedService> _logger;

    public HangfireWorkerHostedService(
        IServiceProvider services,
        HangfireWorkerOptions options,
        ILogger<HangfireWorkerHostedService> logger)
    {
        _services = services;
        _options = options;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var storage = _services.GetRequiredService<JobStorage>();
                RecurringJobRegistration.Register(_services.GetRequiredService<IRecurringJobManager>());
                _logger.LogInformation("Registered FluentA recurring jobs with Hangfire storage.");

                using var server = new BackgroundJobServer(
                    new BackgroundJobServerOptions { WorkerCount = _options.WorkerCount },
                    storage);
                _logger.LogInformation("FluentA Hangfire worker server started with {WorkerCount} workers.", _options.WorkerCount);

                await Task.Delay(Timeout.InfiniteTimeSpan, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Hangfire worker startup failed. Retrying in {RetryDelaySeconds} seconds.", RetryDelay.TotalSeconds);
                try
                {
                    await Task.Delay(RetryDelay, stoppingToken);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    return;
                }
            }
        }
    }
}
