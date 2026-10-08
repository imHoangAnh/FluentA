using System.Net.Http.Headers;
using FluentA.Application.BoundedContexts.Assets;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Infrastructure.UnitTests;

public sealed class AssetObjectStorageIntegrationTests
{
    [CloudStorageIntegrationFact]
    public async Task Presign_put_metadata_and_get_lifecycle_works_against_configured_bucket()
    {
        var values = new Dictionary<string, string?>
        {
            ["AssetStorage:Enabled"] = "true",
            ["AssetStorage:Endpoint"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ENDPOINT") ?? "",
            ["AssetStorage:Bucket"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_BUCKET"),
            ["AssetStorage:Region"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_REGION"),
            ["AssetStorage:AccessKey"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ACCESS_KEY") ?? "",
            ["AssetStorage:SecretKey"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_SECRET_KEY") ?? "",
            ["AssetStorage:UsePathStyle"] = Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_USE_PATH_STYLE") ?? "false"
        };
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(values).Build();
        var services = new ServiceCollection();
        services.AddFluentAInfrastructure(configuration);
        using var provider = services.BuildServiceProvider();
        var storage = provider.GetRequiredService<IAssetObjectStorage>();
        using var http = new HttpClient();
        var objectKey = $"integration/runtime-{Guid.NewGuid():N}.png";

        try
        {
            await storage.VerifyBucketAccessAsync();
            await UploadAndVerifyAsync(storage, http, objectKey, PngPayload());
        }
        finally
        {
            await provider.GetRequiredService<FluentA.Infrastructure.ObjectStorage.Assets.AssetStorageClients>().Operations.DeleteObjectAsync(
                new Amazon.S3.Model.DeleteObjectRequest { BucketName = values["AssetStorage:Bucket"], Key = objectKey });
        }
    }

    private static async Task UploadAndVerifyAsync(
        IAssetObjectStorage storage,
        HttpClient http,
        string objectKey,
        byte[] payload)
    {
        var upload = storage.CreatePresignedUpload(new AssetUploadRequest(
            objectKey,
            "image/png",
            TimeSpan.FromMinutes(5)));
        using var uploadContent = new ByteArrayContent(payload);
        uploadContent.Headers.ContentType = new MediaTypeHeaderValue("image/png");

        using var uploadResponse = await http.PutAsync(upload.Url, uploadContent);
        uploadResponse.EnsureSuccessStatusCode();

        var metadata = await storage.GetObjectMetadataAsync(objectKey);
        Assert.NotNull(metadata);
        Assert.Equal(payload.Length, metadata.SizeBytes);
        Assert.Equal("image/png", metadata.ContentType);

        var prefix = await storage.GetObjectPrefixAsync(objectKey, 8);
        Assert.Equal(payload[..8], prefix);

        var download = storage.CreatePresignedDownload(new AssetDownloadRequest(
            objectKey,
            TimeSpan.FromMinutes(5)));
        Assert.Equal(payload, await http.GetByteArrayAsync(download.Url));
    }

    private static byte[] PngPayload() =>
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02];

    private sealed class CloudStorageIntegrationFactAttribute : FactAttribute
    {
        public CloudStorageIntegrationFactAttribute()
        {
            if (Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_ENABLED") != "true"
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_BUCKET"))
                || string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_OBJECT_STORAGE_REGION")))
            {
                Skip = "Set FLUENTA_TEST_OBJECT_STORAGE_ENABLED=true, bucket, region and provider credentials to run the cloud storage lifecycle.";
            }
        }
    }
}
