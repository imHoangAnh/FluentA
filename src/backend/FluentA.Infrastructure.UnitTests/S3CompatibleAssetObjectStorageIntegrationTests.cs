using System.Net.Http.Headers;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.ObjectStorage.Assets;

namespace FluentA.Infrastructure.UnitTests;

public sealed class S3CompatibleAssetObjectStorageIntegrationTests
{
    [MinioIntegrationFact]
    public async Task Presign_put_metadata_get_and_delete_lifecycle_works_against_private_minio()
    {
        var endpoint = Environment.GetEnvironmentVariable("FLUENTA_TEST_MINIO_ENDPOINT")!;

        const string bucket = "fluenta-assets-integration";
        const string objectKey = "integration/avatar.png";
        var options = new AssetStorageOptions
        {
            Enabled = true,
            Endpoint = endpoint,
            Bucket = bucket,
            AccessKey = "fluenta-integration",
            SecretKey = "fluenta-integration-secret",
            Region = "us-east-1",
            UsePathStyle = true
        };
        using var client = CreateClient(endpoint, options);
        var storage = new S3CompatibleAssetObjectStorage(client, options);
        using var http = new HttpClient();
        var payload = PngPayload();

        await client.PutBucketAsync(new PutBucketRequest { BucketName = bucket });
        try
        {
            await storage.VerifyBucketAccessAsync();
            await UploadAndVerifyAsync(storage, http, objectKey, payload);
        }
        finally
        {
            await client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = bucket, Key = objectKey });
            await client.DeleteBucketAsync(new DeleteBucketRequest { BucketName = bucket });
        }
    }

    [LocalRuntimeIntegrationFact]
    public async Task Separate_https_public_endpoint_proxies_presigned_transfer_to_private_operations_endpoint()
    {
        var endpoint = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_ENDPOINT")!;
        var publicEndpoint = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_PUBLIC_ENDPOINT")!;
        var options = new AssetStorageOptions
        {
            Enabled = true,
            Endpoint = endpoint,
            PublicEndpoint = publicEndpoint,
            Bucket = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_BUCKET")!,
            AccessKey = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_ACCESS_KEY")!,
            SecretKey = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_SECRET_KEY")!,
            Region = Environment.GetEnvironmentVariable("FLUENTA_TEST_S3_REGION") ?? "us-east-1",
            UsePathStyle = true
        };
        using var operations = CreateClient(endpoint, options);
        using var presigning = CreateClient(publicEndpoint, options);
        var storage = new S3CompatibleAssetObjectStorage(
            new AssetStorageClients(operations, presigning, ownsClients: false),
            options);
        using var handler = new HttpClientHandler
        {
            ServerCertificateCustomValidationCallback = HttpClientHandler.DangerousAcceptAnyServerCertificateValidator
        };
        using var http = new HttpClient(handler);
        var objectKey = $"integration/runtime-{Guid.NewGuid():N}.png";

        try
        {
            await storage.VerifyBucketAccessAsync();
            await UploadAndVerifyAsync(storage, http, objectKey, PngPayload());
        }
        finally
        {
            await storage.DeleteIfExistsAsync(objectKey);
        }
    }

    private static async Task UploadAndVerifyAsync(
        S3CompatibleAssetObjectStorage storage,
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

    private static AmazonS3Client CreateClient(string endpoint, AssetStorageOptions options) => new(
        new BasicAWSCredentials(options.AccessKey, options.SecretKey),
        new AmazonS3Config
        {
            ServiceURL = endpoint,
            ForcePathStyle = options.UsePathStyle,
            AuthenticationRegion = options.Region,
            UseHttp = endpoint.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
        });

    private static byte[] PngPayload() =>
        [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02];

    private sealed class MinioIntegrationFactAttribute : FactAttribute
    {
        public MinioIntegrationFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_MINIO_ENDPOINT")))
            {
                Skip = "Set FLUENTA_TEST_MINIO_ENDPOINT to run the isolated MinIO integration proof.";
            }
        }
    }

    private sealed class LocalRuntimeIntegrationFactAttribute : FactAttribute
    {
        private static readonly string[] RequiredVariables =
        [
            "FLUENTA_TEST_S3_ENDPOINT",
            "FLUENTA_TEST_S3_PUBLIC_ENDPOINT",
            "FLUENTA_TEST_S3_BUCKET",
            "FLUENTA_TEST_S3_ACCESS_KEY",
            "FLUENTA_TEST_S3_SECRET_KEY"
        ];

        public LocalRuntimeIntegrationFactAttribute()
        {
            if (RequiredVariables.Any(name =>
                    string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable(name))))
            {
                Skip = "Set the FLUENTA_TEST_S3_* variables to run the packaged local runtime proof.";
            }
        }
    }
}
