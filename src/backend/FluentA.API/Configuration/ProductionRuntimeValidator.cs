using System.Net;
using FluentA.Infrastructure.ObjectStorage.Assets;
using Microsoft.Extensions.Hosting;

namespace FluentA.API.Configuration;

public static class ProductionRuntimeValidator
{
    public static void Validate(IConfiguration configuration, IHostEnvironment environment)
    {
        if (!environment.IsProduction())
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(configuration.GetConnectionString("Postgres")))
        {
            throw new InvalidOperationException("Production PostgreSQL configuration is required.");
        }

        var assetStorage = AssetStorageOptions.FromConfiguration(configuration);
        if (!assetStorage.Enabled)
        {
            throw new InvalidOperationException("Production asset storage must be enabled.");
        }

        assetStorage.Validate();
        if (assetStorage.Provider != AssetStorageProvider.S3)
        {
            throw new InvalidOperationException("Production asset storage provider must be S3.");
        }

        if (!string.Equals(assetStorage.Region, "ap-southeast-1", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Production asset storage region must be ap-southeast-1.");
        }

        ValidateFrontend(configuration);
        ValidateForwardedHeaders(configuration);
        ValidateOptionalAzureSpeech(configuration);
    }

    private static void ValidateFrontend(IConfiguration configuration)
    {
        var baseUrl = configuration["Frontend:BaseUrl"]?.Trim();
        if (!IsHttpsUrl(baseUrl))
        {
            throw new InvalidOperationException("Production frontend base URL must use HTTPS.");
        }

        var origins = configuration.GetSection("Frontend:Origins").Get<string[]>() ?? [];
        if (origins.Length == 0 || origins.Any(origin => !IsHttpsOrigin(origin)))
        {
            throw new InvalidOperationException("Production frontend origins must contain only HTTPS origins.");
        }
    }

    private static void ValidateForwardedHeaders(IConfiguration configuration)
    {
        var proxies = configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [];
        if (proxies.Length == 0 || proxies.Any(proxy => !IPAddress.TryParse(proxy, out _)))
        {
            throw new InvalidOperationException("Production forwarded-header proxies must contain valid IP addresses.");
        }
    }

    private static void ValidateOptionalAzureSpeech(IConfiguration configuration)
    {
        if (!configuration.GetValue<bool>("AzureSpeech:Enabled"))
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(configuration["AzureSpeech:Region"])
            || string.IsNullOrWhiteSpace(configuration["AzureSpeech:SubscriptionKey"]))
        {
            throw new InvalidOperationException("Enabled Azure Speech configuration is incomplete.");
        }
    }

    private static bool IsHttpsUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && string.IsNullOrEmpty(uri.UserInfo);
    }

    private static bool IsHttpsOrigin(string? value)
    {
        if (!IsHttpsUrl(value) || !Uri.TryCreate(value, UriKind.Absolute, out var uri))
        {
            return false;
        }

        return uri.AbsolutePath == "/"
            && string.IsNullOrEmpty(uri.Query)
            && string.IsNullOrEmpty(uri.Fragment);
    }
}
