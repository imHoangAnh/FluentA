using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class AssetStorageOptions
{
    public const string SectionName = "AssetStorage";

    public bool Enabled { get; init; }
    public string Endpoint { get; init; } = string.Empty;
    public string PublicEndpoint { get; init; } = string.Empty;
    public string Bucket { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string Region { get; init; } = "us-east-1";
    public bool UsePathStyle { get; init; }

    public bool HasStaticCredentials =>
        !string.IsNullOrWhiteSpace(AccessKey) && !string.IsNullOrWhiteSpace(SecretKey);

    public string PresigningEndpoint => string.IsNullOrWhiteSpace(PublicEndpoint)
        ? Endpoint
        : PublicEndpoint;

    public static AssetStorageOptions FromConfiguration(IConfiguration configuration) => new()
    {
        Enabled = configuration.GetValue<bool>($"{SectionName}:Enabled"),
        Endpoint = configuration[$"{SectionName}:Endpoint"]?.Trim() ?? string.Empty,
        PublicEndpoint = configuration[$"{SectionName}:PublicEndpoint"]?.Trim() ?? string.Empty,
        Bucket = configuration[$"{SectionName}:Bucket"]?.Trim() ?? string.Empty,
        AccessKey = configuration[$"{SectionName}:AccessKey"]?.Trim() ?? string.Empty,
        SecretKey = configuration[$"{SectionName}:SecretKey"]?.Trim() ?? string.Empty,
        Region = configuration[$"{SectionName}:Region"]?.Trim() ?? "us-east-1",
        UsePathStyle = configuration.GetValue<bool>($"{SectionName}:UsePathStyle")
    };

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

        ValidateEndpoint(Endpoint);
        ValidateEndpoint(PublicEndpoint);

        if (string.IsNullOrWhiteSpace(AccessKey) != string.IsNullOrWhiteSpace(SecretKey))
        {
            throw new InvalidOperationException("AssetStorage static credentials must be configured together.");
        }
    }

    private static void ValidateEndpoint(string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        if (!Uri.TryCreate(value, UriKind.Absolute, out var endpoint)
            || (endpoint.Scheme != Uri.UriSchemeHttp && endpoint.Scheme != Uri.UriSchemeHttps)
            || !string.IsNullOrEmpty(endpoint.UserInfo)
            || !string.IsNullOrEmpty(endpoint.Query)
            || !string.IsNullOrEmpty(endpoint.Fragment))
        {
            throw new InvalidOperationException("AssetStorage endpoint configuration is invalid.");
        }
    }
}
