using FluentA.Infrastructure.ObjectStorage.Assets;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.UnitTests;

public sealed class AssetStorageOptionsTests
{
    [Fact]
    public void FromConfiguration_accepts_custom_s3_compatible_endpoints_and_static_credentials()
    {
        var options = AssetStorageOptions.FromConfiguration(Configuration(new()
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Endpoint"] = "http://minio:9000",
            ["AssetStorage:PublicEndpoint"] = "https://localhost:7443",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:AccessKey"] = "test-access-key",
            ["AssetStorage:SecretKey"] = "test-secret-key",
            ["AssetStorage:UsePathStyle"] = "true"
        }));

        options.Validate();

        Assert.Equal("http://minio:9000", options.Endpoint);
        Assert.Equal("https://localhost:7443", options.PresigningEndpoint);
        Assert.True(options.HasStaticCredentials);
        Assert.True(options.UsePathStyle);
    }

    [Fact]
    public void FromConfiguration_accepts_regional_storage_with_default_credentials()
    {
        var options = AssetStorageOptions.FromConfiguration(Configuration(new()
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:Region"] = "ap-southeast-1"
        }));

        options.Validate();

        Assert.Empty(options.Endpoint);
        Assert.Empty(options.PublicEndpoint);
        Assert.Empty(options.PresigningEndpoint);
        Assert.False(options.HasStaticCredentials);
        Assert.False(options.UsePathStyle);
    }

    [Theory]
    [InlineData("AssetStorage:Endpoint", "not-a-url")]
    [InlineData("AssetStorage:PublicEndpoint", "ftp://storage.example.test")]
    [InlineData("AssetStorage:PublicEndpoint", "https://user@storage.example.test")]
    public void Invalid_endpoint_configuration_fails_without_echoing_the_value(string key, string value)
    {
        var values = ValidConfiguration();
        values[key] = value;
        var options = AssetStorageOptions.FromConfiguration(Configuration(values));

        var exception = Assert.Throws<InvalidOperationException>(options.Validate);

        Assert.Equal("AssetStorage endpoint configuration is invalid.", exception.Message);
        Assert.DoesNotContain(value, exception.Message, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("AssetStorage:AccessKey", "test-only-secret")]
    [InlineData("AssetStorage:SecretKey", "test-only-secret")]
    public void Static_credentials_must_be_configured_as_a_pair(string key, string value)
    {
        var values = ValidConfiguration();
        values[key] = value;
        var options = AssetStorageOptions.FromConfiguration(Configuration(values));

        var exception = Assert.Throws<InvalidOperationException>(options.Validate);

        Assert.Equal("AssetStorage static credentials must be configured together.", exception.Message);
        Assert.DoesNotContain(value, exception.Message, StringComparison.Ordinal);
    }

    private static Dictionary<string, string?> ValidConfiguration() => new()
    {
        ["AssetStorage:Enabled"] = "true",
        ["AssetStorage:Bucket"] = "fluenta-assets-test",
        ["AssetStorage:Region"] = "ap-southeast-1"
    };

    private static IConfiguration Configuration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
