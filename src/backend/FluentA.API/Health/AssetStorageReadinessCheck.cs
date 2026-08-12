using FluentA.Infrastructure.Assets;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace FluentA.API.Health;

public sealed class AssetStorageReadinessCheck : IHealthCheck
{
    private readonly IServiceProvider _services;
    private readonly AssetStorageOptions _options;
    private readonly IHostEnvironment _environment;

    public AssetStorageReadinessCheck(
        IServiceProvider services,
        AssetStorageOptions options,
        IHostEnvironment environment)
    {
        _services = services;
        _options = options;
        _environment = environment;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        if (!_options.Enabled)
        {
            return _environment.IsProduction()
                ? HealthCheckResult.Unhealthy("Asset storage is unavailable.")
                : HealthCheckResult.Healthy();
        }

        try
        {
            _options.Validate();
            var probe = _services.GetService<IAssetStorageReadinessProbe>();
            if (probe is null)
            {
                return HealthCheckResult.Unhealthy("Asset storage is unavailable.");
            }

            await probe.VerifyAsync(cancellationToken);
            return HealthCheckResult.Healthy();
        }
        catch (Exception) when (!cancellationToken.IsCancellationRequested)
        {
            return HealthCheckResult.Unhealthy("Asset storage is unavailable.");
        }
    }
}
