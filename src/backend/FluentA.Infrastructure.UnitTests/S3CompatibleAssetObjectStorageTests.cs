using Amazon;
using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Infrastructure.ObjectStorage.Assets;

namespace FluentA.Infrastructure.UnitTests;

public sealed class S3CompatibleAssetObjectStorageTests
{
    [Fact]
    public void Regional_presigned_urls_are_https_and_support_temporary_credentials()
    {
        using var client = new AmazonS3Client(
            new SessionAWSCredentials("TESTACCESSKEY", "test-secret-key", "test-session-token"),
            RegionEndpoint.APSoutheast1);
        var storage = new S3CompatibleAssetObjectStorage(client, RegionalOptions());

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
    public async Task Custom_presigning_endpoint_is_independent_from_operations_endpoint()
    {
        using var operations = new RecordingS3Client();
        using var presigning = new AmazonS3Client(
            new BasicAWSCredentials("TESTACCESSKEY", "test-secret-key"),
            new AmazonS3Config
            {
                ServiceURL = "https://localhost:7443",
                ForcePathStyle = true,
                AuthenticationRegion = "us-east-1"
            });
        var options = new AssetStorageOptions
        {
            Enabled = true,
            Endpoint = "http://minio:59000",
            PublicEndpoint = "https://localhost:7443",
            Bucket = "fluenta-assets-test",
            AccessKey = "TESTACCESSKEY",
            SecretKey = "test-secret-key",
            Region = "us-east-1",
            UsePathStyle = true
        };
        var storage = new S3CompatibleAssetObjectStorage(
            new AssetStorageClients(operations, presigning, ownsClients: false),
            options);

        var upload = storage.CreatePresignedUpload(new AssetUploadRequest(
            "users/test/avatar.png",
            "image/png",
            TimeSpan.FromMinutes(5)));
        await storage.VerifyBucketAccessAsync();

        var uploadUri = new Uri(upload.Url);
        Assert.Equal("https", uploadUri.Scheme);
        Assert.Equal("localhost", uploadUri.Host);
        Assert.Equal(7443, uploadUri.Port);
        Assert.StartsWith("/fluenta-assets-test/", uploadUri.AbsolutePath, StringComparison.Ordinal);
        Assert.Equal(1, operations.BucketLocationReads);
    }

    [Fact]
    public async Task Bucket_access_failure_is_translated_to_the_storage_contract()
    {
        using var client = new RecordingS3Client { FailBucketLocation = true };
        var storage = new S3CompatibleAssetObjectStorage(client, RegionalOptions());

        var exception = await Assert.ThrowsAsync<AssetStorageUnavailableException>(
            () => storage.VerifyBucketAccessAsync());

        Assert.Equal("Could not access asset storage.", exception.Message);
    }

    private static AssetStorageOptions RegionalOptions() => new()
    {
        Enabled = true,
        Bucket = "fluenta-assets-test",
        Region = "ap-southeast-1"
    };

    private sealed class RecordingS3Client : AmazonS3Client
    {
        public RecordingS3Client()
            : base(
                new BasicAWSCredentials("TESTACCESSKEY", "test-secret-key"),
                new AmazonS3Config { RegionEndpoint = RegionEndpoint.APSoutheast1 })
        {
        }

        public int BucketLocationReads { get; private set; }
        public bool FailBucketLocation { get; init; }

        public override Task<GetBucketLocationResponse> GetBucketLocationAsync(
            GetBucketLocationRequest request,
            CancellationToken cancellationToken = default)
        {
            BucketLocationReads++;
            return FailBucketLocation
                ? Task.FromException<GetBucketLocationResponse>(new AmazonS3Exception("unavailable"))
                : Task.FromResult(new GetBucketLocationResponse());
        }
    }
}
