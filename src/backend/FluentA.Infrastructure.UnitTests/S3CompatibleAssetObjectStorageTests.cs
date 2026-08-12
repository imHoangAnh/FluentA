using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.Assets;

namespace FluentA.Infrastructure.UnitTests;

public sealed class S3CompatibleAssetObjectStorageTests
{
    [Fact]
    public void S3_presigned_urls_are_regional_https_and_support_temporary_credentials()
    {
        using var client = new AmazonS3Client(
            new SessionAWSCredentials("TESTACCESSKEY", "test-secret-key", "test-session-token"),
            RegionEndpoint.APSoutheast1);
        var storage = new S3CompatibleAssetObjectStorage(client, S3Options());

        var upload = storage.CreatePresignedUpload(new AssetUploadRequest(
            "users/test/avatar.png",
            "image/png",
            TimeSpan.FromMinutes(5)));
        var download = storage.CreatePresignedDownload(new AssetDownloadRequest(
            "users/test/avatar.png",
            TimeSpan.FromMinutes(5)));

        var uploadUri = new Uri(upload.Url);
        var downloadUri = new Uri(download.Url);
        Assert.Equal(Uri.UriSchemeHttps, uploadUri.Scheme);
        Assert.Equal("fluenta-assets-test.s3.ap-southeast-1.amazonaws.com", uploadUri.Host);
        Assert.Equal(uploadUri.Host, downloadUri.Host);
        Assert.Contains("X-Amz-Signature=", uploadUri.Query, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("X-Amz-Security-Token=", uploadUri.Query, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("X-Amz-Signature=", downloadUri.Query, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task S3_privacy_check_reads_public_access_block_without_deleting_policy()
    {
        using var client = new RecordingS3Client
        {
            PublicAccessBlock = new PublicAccessBlockConfiguration
            {
                BlockPublicAcls = true,
                IgnorePublicAcls = true,
                BlockPublicPolicy = true,
                RestrictPublicBuckets = true
            }
        };
        var storage = new S3CompatibleAssetObjectStorage(client, S3Options());

        await storage.EnsurePrivateBucketAsync();

        Assert.Equal(1, client.PublicAccessBlockReads);
        Assert.Equal(0, client.BucketPolicyDeletes);
    }

    [Fact]
    public async Task S3_privacy_check_fails_closed_when_any_public_access_block_is_missing()
    {
        using var client = new RecordingS3Client
        {
            PublicAccessBlock = new PublicAccessBlockConfiguration
            {
                BlockPublicAcls = true,
                IgnorePublicAcls = true,
                BlockPublicPolicy = true,
                RestrictPublicBuckets = false
            }
        };
        var storage = new S3CompatibleAssetObjectStorage(client, S3Options());

        var exception = await Assert.ThrowsAsync<AssetStorageUnavailableException>(
            () => storage.EnsurePrivateBucketAsync());

        Assert.Equal("Required S3 public-access protections are not enabled.", exception.Message);
        Assert.Equal(0, client.BucketPolicyDeletes);
    }

    [Fact]
    public async Task Minio_privacy_enforcement_retains_the_existing_policy_delete_behavior()
    {
        using var client = new RecordingS3Client();
        var storage = new S3CompatibleAssetObjectStorage(client, new AssetStorageOptions
        {
            Enabled = true,
            Provider = AssetStorageProvider.Minio,
            Endpoint = "http://127.0.0.1:9000",
            Bucket = "fluenta-assets-test",
            AccessKey = "test-access-key",
            SecretKey = "test-secret-key",
            Region = "us-east-1",
            UsePathStyle = true
        });

        await storage.EnsurePrivateBucketAsync();

        Assert.Equal(1, client.BucketPolicyDeletes);
        Assert.Equal(0, client.PublicAccessBlockReads);
    }

    private static AssetStorageOptions S3Options() => new()
    {
        Enabled = true,
        Provider = AssetStorageProvider.S3,
        Bucket = "fluenta-assets-test",
        Region = "ap-southeast-1",
        UsePathStyle = false
    };

    private sealed class RecordingS3Client : AmazonS3Client
    {
        public RecordingS3Client()
            : base(
                new BasicAWSCredentials("TESTACCESSKEY", "test-secret-key"),
                new AmazonS3Config { RegionEndpoint = RegionEndpoint.APSoutheast1 })
        {
        }

        public int PublicAccessBlockReads { get; private set; }
        public int BucketPolicyDeletes { get; private set; }
        public PublicAccessBlockConfiguration? PublicAccessBlock { get; init; }

        public override Task<GetPublicAccessBlockResponse> GetPublicAccessBlockAsync(
            GetPublicAccessBlockRequest request,
            CancellationToken cancellationToken = default)
        {
            PublicAccessBlockReads++;
            return Task.FromResult(new GetPublicAccessBlockResponse
            {
                PublicAccessBlockConfiguration = PublicAccessBlock
            });
        }

        public override Task<DeleteBucketPolicyResponse> DeleteBucketPolicyAsync(
            DeleteBucketPolicyRequest request,
            CancellationToken cancellationToken = default)
        {
            BucketPolicyDeletes++;
            return Task.FromResult(new DeleteBucketPolicyResponse());
        }
    }
}
