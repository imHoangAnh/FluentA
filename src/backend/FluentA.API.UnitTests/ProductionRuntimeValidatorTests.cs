using FluentA.API.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;

namespace FluentA.API.UnitTests;

public sealed class ProductionRuntimeValidatorTests
{
    [Fact]
    public void Validate_accepts_the_approved_production_topology()
    {
        var configuration = BuildConfiguration();

        ProductionRuntimeValidator.Validate(configuration, ProductionEnvironment());
    }

    [Fact]
    public void Validate_does_not_apply_production_requirements_in_development()
    {
        var configuration = new ConfigurationBuilder().Build();

        ProductionRuntimeValidator.Validate(configuration, DevelopmentEnvironment());
    }

    [Theory]
    [InlineData("ConnectionStrings:Postgres", "")]
    [InlineData("AssetStorage:Enabled", "false")]
    [InlineData("AssetStorage:Endpoint", "https://storage.example.test")]
    [InlineData("AssetStorage:PublicEndpoint", "https://storage.example.test")]
    [InlineData("AssetStorage:AccessKey", "test-access-key")]
    [InlineData("AssetStorage:UsePathStyle", "true")]
    [InlineData("AssetStorage:Region", "us-east-1")]
    [InlineData("Frontend:BaseUrl", "http://sophion.io.vn")]
    [InlineData("Frontend:Origins:0", "https://sophion.io.vn/path")]
    [InlineData("ForwardedHeaders:KnownProxies:0", "not-an-ip")]
    public void Validate_rejects_invalid_production_configuration(string key, string value)
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?> { [key] = value });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionRuntimeValidator.Validate(configuration, ProductionEnvironment()));

        Assert.DoesNotContain("test-only-secret", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void Validate_rejects_incomplete_enabled_azure_speech_without_exposing_values()
    {
        var configuration = BuildConfiguration(new Dictionary<string, string?>
        {
            ["AzureSpeech:Enabled"] = "true",
            ["AzureSpeech:Region"] = "",
            ["AzureSpeech:SubscriptionKey"] = "test-only-secret"
        });

        var exception = Assert.Throws<InvalidOperationException>(() =>
            ProductionRuntimeValidator.Validate(configuration, ProductionEnvironment()));

        Assert.Equal("Enabled Azure Speech configuration is incomplete.", exception.Message);
    }

    private static IConfiguration BuildConfiguration(Dictionary<string, string?>? overrides = null)
    {
        var values = new Dictionary<string, string?>
        {
            ["ConnectionStrings:Postgres"] = "Host=postgres;Database=fluenta;Username=fluenta;Password=test-only-secret",
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Bucket"] = "fluenta-assets",
            ["AssetStorage:Region"] = "ap-southeast-1",
            ["AssetStorage:UsePathStyle"] = "false",
            ["Frontend:BaseUrl"] = "https://sophion.io.vn",
            ["Frontend:Origins:0"] = "https://sophion.io.vn",
            ["ForwardedHeaders:KnownProxies:0"] = "172.30.0.2",
            ["AzureSpeech:Enabled"] = "false"
        };

        if (overrides is not null)
        {
            foreach (var pair in overrides)
            {
                values[pair.Key] = pair.Value;
            }
        }

        return new ConfigurationBuilder().AddInMemoryCollection(values).Build();
    }

    private static IHostEnvironment ProductionEnvironment() => new TestHostEnvironment
    {
        EnvironmentName = Environments.Production
    };

    private static IHostEnvironment DevelopmentEnvironment() => new TestHostEnvironment
    {
        EnvironmentName = Environments.Development
    };

    private sealed class TestHostEnvironment : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = string.Empty;
        public string ApplicationName { get; set; } = "FluentA.Tests";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
