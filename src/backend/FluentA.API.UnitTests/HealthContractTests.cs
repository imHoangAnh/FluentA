using FluentA.API.HealthChecks;
using FluentA.Infrastructure.ObjectStorage.Assets;
using FluentA.Infrastructure.Persistence;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace FluentA.API.UnitTests;

public sealed class HealthContractTests
{
    [Fact]
    public async Task Response_writer_exposes_only_the_aggregate_status()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        var report = new HealthReport(
            new Dictionary<string, HealthReportEntry>(),
            HealthStatus.Unhealthy,
            TimeSpan.Zero);

        await HealthResponseWriter.WriteAsync(context, report);

        context.Response.Body.Position = 0;
        using var reader = new StreamReader(context.Response.Body);
        Assert.Equal("{\"status\":\"Unhealthy\"}", await reader.ReadToEndAsync());
        Assert.Equal("application/json; charset=utf-8", context.Response.ContentType);
    }

    [Fact]
    public async Task Asset_storage_readiness_is_unhealthy_when_disabled_in_production()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var check = new AssetStorageReadinessCheck(
            services,
            new AssetStorageOptions { Enabled = false },
            Environment(Environments.Production));

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    [Fact]
    public async Task Asset_storage_readiness_allows_disabled_storage_in_development()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var check = new AssetStorageReadinessCheck(
            services,
            new AssetStorageOptions { Enabled = false },
            Environment(Environments.Development));

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Healthy, result.Status);
    }

    [Fact]
    public async Task Asset_storage_readiness_is_unhealthy_when_enabled_without_a_registered_probe()
    {
        using var services = new ServiceCollection().BuildServiceProvider();
        var check = new AssetStorageReadinessCheck(
            services,
            new AssetStorageOptions
            {
                Enabled = true,
                Endpoint = "http://minio:9000",
                Bucket = "fluenta-assets",
                AccessKey = "test-access-key",
                SecretKey = "test-secret-key"
            },
            Environment(Environments.Production));

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    [Fact]
    public async Task Asset_storage_readiness_is_healthy_when_the_registered_probe_succeeds()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IAssetStorageReadinessProbe>(new FakeReadinessProbe());
        using var provider = services.BuildServiceProvider();
        var check = new AssetStorageReadinessCheck(
            provider,
            ValidS3Options(),
            Environment(Environments.Production));

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Healthy, result.Status);
    }

    [Fact]
    public async Task Asset_storage_readiness_hides_probe_failure_details()
    {
        var services = new ServiceCollection();
        services.AddSingleton<IAssetStorageReadinessProbe>(new FakeReadinessProbe(
            new InvalidOperationException("test-only-sensitive-detail")));
        using var provider = services.BuildServiceProvider();
        var check = new AssetStorageReadinessCheck(
            provider,
            ValidS3Options(),
            Environment(Environments.Production));

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
        Assert.Equal("Asset storage is unavailable.", result.Description);
        Assert.DoesNotContain("test-only-sensitive-detail", result.Description, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Postgres_readiness_is_unhealthy_when_the_database_is_unreachable()
    {
        var services = new ServiceCollection();
        services.AddDbContext<AppDbContext>(options => options.UseNpgsql(
            "Host=127.0.0.1;Port=1;Database=fluenta;Username=fluenta;Password=test;Timeout=1"));
        await using var provider = services.BuildServiceProvider();
        var check = new PostgresReadinessCheck(provider.GetRequiredService<IServiceScopeFactory>());

        var result = await check.CheckHealthAsync(new HealthCheckContext());

        Assert.Equal(HealthStatus.Unhealthy, result.Status);
    }

    private static IHostEnvironment Environment(string name) => new TestHostEnvironment
    {
        EnvironmentName = name
    };

    private static AssetStorageOptions ValidS3Options() => new()
    {
        Enabled = true,
        Bucket = "fluenta-assets-test",
        Region = "ap-southeast-1"
    };

    private sealed class FakeReadinessProbe(Exception? failure = null) : IAssetStorageReadinessProbe
    {
        public Task VerifyAsync(CancellationToken cancellationToken = default) =>
            failure is null ? Task.CompletedTask : Task.FromException(failure);
    }

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = string.Empty;
        public string ApplicationName { get; set; } = "FluentA.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
