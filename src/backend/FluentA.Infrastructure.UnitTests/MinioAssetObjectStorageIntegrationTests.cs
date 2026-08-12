using System.Net.Http.Headers;
using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.Assets;

namespace FluentA.Infrastructure.UnitTests;

public sealed class MinioAssetObjectStorageIntegrationTests
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
            Provider = AssetStorageProvider.Minio,
            Endpoint = endpoint,
            Bucket = bucket,
            AccessKey = "fluenta-integration",
            SecretKey = "fluenta-integration-secret",
            Region = "us-east-1",
            UsePathStyle = true
        };
        using var client = new AmazonS3Client(
            options.AccessKey,
            options.SecretKey,
            new AmazonS3Config
            {
                ServiceURL = endpoint,
                ForcePathStyle = true,
                AuthenticationRegion = options.Region,
                UseHttp = true
            });
        var storage = new S3CompatibleAssetObjectStorage(client, options);
        using var http = new HttpClient();
        var payload = new byte[] { 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x01, 0x02 };

        await client.PutBucketAsync(new PutBucketRequest { BucketName = bucket });
        try
        {
            await storage.EnsurePrivateBucketAsync();
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

            await storage.DeleteIfExistsAsync(objectKey);
            Assert.Null(await storage.GetObjectMetadataAsync(objectKey));
        }
        finally
        {
            await client.DeleteObjectAsync(new DeleteObjectRequest { BucketName = bucket, Key = objectKey });
            await client.DeleteBucketAsync(new DeleteBucketRequest { BucketName = bucket });
        }
    }

    private sealed class MinioIntegrationFactAttribute : FactAttribute
    {
        public MinioIntegrationFactAttribute()
        {
            if (string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("FLUENTA_TEST_MINIO_ENDPOINT")))
            {
                Skip = "Set FLUENTA_TEST_MINIO_ENDPOINT to run the local MinIO integration proof.";
            }
        }
    }
}
