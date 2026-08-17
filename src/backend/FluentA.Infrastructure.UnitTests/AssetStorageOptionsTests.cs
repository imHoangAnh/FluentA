using FluentA.Infrastructure.ObjectStorage.Assets;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.UnitTests;

public sealed class AssetStorageOptionsTests
{
    [Fact]
    public void FromConfiguration_defaults_legacy_development_configuration_to_minio()
    {
        var options = AssetStorageOptions.FromConfiguration(Configuration(new()
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Endpoint"] = "http://127.0.0.1:9000",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:AccessKey"] = "test-access-key",
            ["AssetStorage:SecretKey"] = "test-secret-key"
        }));

        options.Validate();

        Assert.Equal(AssetStorageProvider.Minio, options.Provider);
        Assert.True(options.UsePathStyle);
    }

    [Fact]
    public void FromConfiguration_accepts_private_s3_without_static_credentials()
    {
        var options = AssetStorageOptions.FromConfiguration(Configuration(new()
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Provider"] = "s3",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:Region"] = "ap-southeast-1"
        }));

        options.Validate();

        Assert.Equal(AssetStorageProvider.S3, options.Provider);
        Assert.False(options.UsePathStyle);
        Assert.Empty(options.AccessKey);
        Assert.Empty(options.SecretKey);
    }

    [Theory]
    [InlineData("AssetStorage:Endpoint", "https://storage.example.test")]
    [InlineData("AssetStorage:AccessKey", "test-access-key")]
    [InlineData("AssetStorage:SecretKey", "test-only-secret")]
    [InlineData("AssetStorage:UsePathStyle", "true")]
    public void S3_rejects_custom_endpoint_static_credentials_and_path_style(string key, string value)
    {
        var values = ValidS3Configuration();
        values[key] = value;
        var options = AssetStorageOptions.FromConfiguration(Configuration(values));

        var exception = Assert.Throws<InvalidOperationException>(options.Validate);

        Assert.DoesNotContain(value, exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("test-only-secret", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Unknown_provider_fails_without_echoing_the_value()
    {
        var configuration = Configuration(new()
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Provider"] = "test-only-secret"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            AssetStorageOptions.FromConfiguration(configuration));

        Assert.Equal("AssetStorage provider is invalid.", exception.Message);
        Assert.DoesNotContain("test-only-secret", exception.Message, StringComparison.Ordinal);
    }

    private static Dictionary<string, string?> ValidS3Configuration() => new()
    {
        ["AssetStorage:Enabled"] = "true",
        ["AssetStorage:Provider"] = "S3",
        ["AssetStorage:Bucket"] = "fluenta-assets-test",
        ["AssetStorage:Region"] = "ap-southeast-1",
        ["AssetStorage:UsePathStyle"] = "false"
    };

    private static IConfiguration Configuration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
