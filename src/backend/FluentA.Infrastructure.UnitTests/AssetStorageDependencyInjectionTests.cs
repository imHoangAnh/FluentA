using Amazon;
using Amazon.S3;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.ObjectStorage.Assets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure.UnitTests;

public sealed class AssetStorageDependencyInjectionTests
{
    [Fact]
    public void Custom_endpoint_configuration_signs_direct_cloud_urls_with_auto_region()
    {
        using var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Endpoint"] = "https://0123456789abcdef0123456789abcdef.r2.cloudflarestorage.com",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:AccessKey"] = "TESTACCESSKEY",
            ["AssetStorage:SecretKey"] = "test-secret-key",
            ["AssetStorage:Region"] = "auto"
        });
        var clients = provider.GetRequiredService<AssetStorageClients>();
        Assert.Same(clients.Operations, clients.Presigning);
        var storage = provider.GetRequiredService<IAssetObjectStorage>();
        var upload = storage.CreatePresignedUpload(new AssetUploadRequest(
            "integration/image.png", "image/png", TimeSpan.FromMinutes(5)));
        var url = new Uri(upload.Url);
        Assert.Equal("https", url.Scheme);
        Assert.EndsWith(".r2.cloudflarestorage.com", url.Host, StringComparison.Ordinal);
        Assert.Contains("/auto/s3/aws4_request", Uri.UnescapeDataString(url.Query), StringComparison.Ordinal);
        Assert.Contains("X-Amz-Signature=", url.Query, StringComparison.Ordinal);
    }

    [Fact]
    public void Regional_registration_reuses_one_virtual_hosted_client()
    {
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:Region"] = "ap-southeast-1"
        });

        using (provider)
        {
            var clients = provider.GetRequiredService<AssetStorageClients>();
            var clientConfig = Assert.IsType<AmazonS3Config>(clients.Operations.Config);

            Assert.Same(clients.Operations, clients.Presigning);
            Assert.Equal(RegionEndpoint.APSoutheast1.SystemName, clientConfig.RegionEndpoint.SystemName);
            Assert.False(clientConfig.ForcePathStyle);
            Assert.Null(clientConfig.ServiceURL);
            Assert.IsType<AssetObjectStorage>(provider.GetRequiredService<IAssetObjectStorage>());
            Assert.IsType<AssetStorageReadinessProbe>(provider.GetRequiredService<IAssetStorageReadinessProbe>());
        }
    }

    [Fact]
    public void Custom_registration_builds_internal_operations_and_public_presigning_clients()
    {
        var provider = BuildProvider(new Dictionary<string, string?>
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Endpoint"] = "https://storage.example.test",
            ["AssetStorage:PublicEndpoint"] = "https://storage-browser.example.test",
            ["AssetStorage:Bucket"] = "fluenta-assets-test",
            ["AssetStorage:AccessKey"] = "test-access-key",
            ["AssetStorage:SecretKey"] = "test-secret-key",
            ["AssetStorage:Region"] = "us-east-1",
            ["AssetStorage:UsePathStyle"] = "true"
        });

        using (provider)
        {
            var clients = provider.GetRequiredService<AssetStorageClients>();
            var operationsConfig = Assert.IsType<AmazonS3Config>(clients.Operations.Config);
            var presigningConfig = Assert.IsType<AmazonS3Config>(clients.Presigning.Config);

            Assert.NotSame(clients.Operations, clients.Presigning);
            Assert.Equal("https://storage.example.test/", operationsConfig.ServiceURL);
            Assert.Equal("https://storage-browser.example.test/", presigningConfig.ServiceURL);
            Assert.True(operationsConfig.ForcePathStyle);
            Assert.True(presigningConfig.ForcePathStyle);
        }
    }

    private static ServiceProvider BuildProvider(Dictionary<string, string?> values)
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddFluentAInfrastructure(configuration);
        return services.BuildServiceProvider();
    }
}
