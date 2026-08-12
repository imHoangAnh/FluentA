using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Assets;

public enum AssetStorageProvider
{
    Minio,
    S3
}

public sealed class AssetStorageOptions
{
    public const string SectionName = "AssetStorage";

    public bool Enabled { get; init; }
    public AssetStorageProvider Provider { get; init; } = AssetStorageProvider.Minio;
    public string Endpoint { get; init; } = string.Empty;
    public string Bucket { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string Region { get; init; } = "us-east-1";
    public bool UsePathStyle { get; init; } = true;

    public static AssetStorageOptions FromConfiguration(IConfiguration configuration)
    {
        var provider = ParseProvider(configuration[$"{SectionName}:Provider"]);
        return new AssetStorageOptions
        {
            Enabled = configuration.GetValue<bool>($"{SectionName}:Enabled"),
            Provider = provider,
            Endpoint = configuration[$"{SectionName}:Endpoint"]?.Trim() ?? string.Empty,
            Bucket = configuration[$"{SectionName}:Bucket"]?.Trim() ?? string.Empty,
            AccessKey = configuration[$"{SectionName}:AccessKey"]?.Trim() ?? string.Empty,
            SecretKey = configuration[$"{SectionName}:SecretKey"]?.Trim() ?? string.Empty,
            Region = configuration[$"{SectionName}:Region"]?.Trim() ?? "us-east-1",
            UsePathStyle = configuration.GetValue<bool?>($"{SectionName}:UsePathStyle")
                ?? provider == AssetStorageProvider.Minio
        };
    }

    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(Bucket) || string.IsNullOrWhiteSpace(Region))
        {
            throw new InvalidOperationException("AssetStorage configuration is incomplete.");
        }

        switch (Provider)
        {
            case AssetStorageProvider.Minio:
                ValidateMinio();
                break;
            case AssetStorageProvider.S3:
                ValidateS3();
                break;
            default:
                throw new InvalidOperationException("AssetStorage provider is invalid.");
        }
    }

    private void ValidateMinio()
    {
        if (string.IsNullOrWhiteSpace(Endpoint)
            || string.IsNullOrWhiteSpace(AccessKey)
            || string.IsNullOrWhiteSpace(SecretKey)
            || !UsePathStyle
            || !Uri.TryCreate(Endpoint, UriKind.Absolute, out var endpoint)
            || (endpoint.Scheme != Uri.UriSchemeHttp && endpoint.Scheme != Uri.UriSchemeHttps)
            || !string.IsNullOrEmpty(endpoint.UserInfo))
        {
            throw new InvalidOperationException("Minio asset storage configuration is invalid.");
        }
    }

    private void ValidateS3()
    {
        if (!string.IsNullOrWhiteSpace(Endpoint)
            || !string.IsNullOrWhiteSpace(AccessKey)
            || !string.IsNullOrWhiteSpace(SecretKey)
            || UsePathStyle)
        {
            throw new InvalidOperationException("S3 asset storage must use the default credential chain and virtual-hosted addressing.");
        }
    }

    private static AssetStorageProvider ParseProvider(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return AssetStorageProvider.Minio;
        }

        if (Enum.TryParse<AssetStorageProvider>(value.Trim(), ignoreCase: true, out var provider)
            && Enum.IsDefined(provider))
        {
            return provider;
        }

        throw new InvalidOperationException("AssetStorage provider is invalid.");
    }
}
