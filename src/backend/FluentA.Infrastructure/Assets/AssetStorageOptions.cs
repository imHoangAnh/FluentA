using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Assets;

public sealed class AssetStorageOptions
{
    public const string SectionName = "AssetStorage";

    public bool Enabled { get; init; }
    public string Endpoint { get; init; } = string.Empty;
    public string Bucket { get; init; } = string.Empty;
    public string AccessKey { get; init; } = string.Empty;
    public string SecretKey { get; init; } = string.Empty;
    public string Region { get; init; } = "us-east-1";
    public bool UsePathStyle { get; init; } = true;

    public static AssetStorageOptions FromConfiguration(IConfiguration configuration)
    {
        return new AssetStorageOptions
        {
            Enabled = configuration.GetValue<bool>($"{SectionName}:Enabled"),
            Endpoint = configuration[$"{SectionName}:Endpoint"] ?? string.Empty,
            Bucket = configuration[$"{SectionName}:Bucket"] ?? string.Empty,
            AccessKey = configuration[$"{SectionName}:AccessKey"] ?? string.Empty,
            SecretKey = configuration[$"{SectionName}:SecretKey"] ?? string.Empty,
            Region = configuration[$"{SectionName}:Region"] ?? "us-east-1",
            UsePathStyle = configuration.GetValue<bool?>($"{SectionName}:UsePathStyle") ?? true
        };
    }

    public void Validate()
    {
        if (!Enabled)
        {
            return;
        }

        if (string.IsNullOrWhiteSpace(Endpoint)
            || string.IsNullOrWhiteSpace(Bucket)
            || string.IsNullOrWhiteSpace(AccessKey)
            || string.IsNullOrWhiteSpace(SecretKey))
        {
            throw new InvalidOperationException("AssetStorage configuration is incomplete.");
        }
    }
}
