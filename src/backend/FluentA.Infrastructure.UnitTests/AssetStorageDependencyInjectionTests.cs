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
    public void S3_registration_uses_regional_virtual_hosted_client_and_provider_neutral_adapter()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["AssetStorage:Enabled"] = "true",
                ["AssetStorage:Provider"] = "S3",
                ["AssetStorage:Bucket"] = "fluenta-assets-test",
                ["AssetStorage:Region"] = "ap-southeast-1"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddFluentAInfrastructure(configuration);
        using var provider = services.BuildServiceProvider();
        var client = provider.GetRequiredService<IAmazonS3>();
        var storage = provider.GetRequiredService<IAssetObjectStorage>();
        var clientConfig = Assert.IsType<AmazonS3Config>(client.Config);

        Assert.Equal(RegionEndpoint.APSoutheast1.SystemName, clientConfig.RegionEndpoint.SystemName);
        Assert.False(clientConfig.ForcePathStyle);
        Assert.Null(clientConfig.ServiceURL);
        Assert.IsType<S3CompatibleAssetObjectStorage>(storage);
        Assert.IsType<AssetStorageReadinessProbe>(provider.GetRequiredService<IAssetStorageReadinessProbe>());
    }
}
