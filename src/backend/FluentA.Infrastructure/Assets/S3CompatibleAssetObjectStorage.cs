using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using Protocol = Amazon.S3.Protocol;

namespace FluentA.Infrastructure.Assets;

public sealed class S3CompatibleAssetObjectStorage : IAssetObjectStorage
{
    private readonly IAmazonS3 _client;
    private readonly AssetStorageOptions _options;
    private readonly Protocol _presignProtocol;

    public S3CompatibleAssetObjectStorage(IAmazonS3 client, AssetStorageOptions options)
    {
        _client = client;
        _options = options;
        _options.Validate();
        _presignProtocol = options.Provider == AssetStorageProvider.S3
            ? Protocol.HTTPS
            : GetMinioProtocol(options.Endpoint);
    }

    public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request)
    {
        var expiresAtUtc = DateTime.UtcNow.Add(request.Lifetime);
        var url = _client.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _options.Bucket,
            Key = request.ObjectKey,
            Verb = HttpVerb.PUT,
            Protocol = _presignProtocol,
            Expires = expiresAtUtc,
            ContentType = request.ContentType
        });

        return new AssetPresignedUpload(url, expiresAtUtc, _options.Bucket);
    }

    public AssetPresignedDownload CreatePresignedDownload(AssetDownloadRequest request)
    {
        var expiresAtUtc = DateTime.UtcNow.Add(request.Lifetime);
        var url = _client.GetPreSignedURL(new GetPreSignedUrlRequest
        {
            BucketName = _options.Bucket,
            Key = request.ObjectKey,
            Verb = HttpVerb.GET,
            Protocol = _presignProtocol,
            Expires = expiresAtUtc
        });

        return new AssetPresignedDownload(url, expiresAtUtc);
    }

    public async Task<AssetObjectMetadata?> GetObjectMetadataAsync(
        string objectKey,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _client.GetObjectMetadataAsync(new GetObjectMetadataRequest
            {
                BucketName = _options.Bucket,
                Key = objectKey
            }, cancellationToken);

            return new AssetObjectMetadata(
                objectKey,
                response.ContentLength,
                response.Headers.ContentType ?? "application/octet-stream",
                response.ETag);
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<byte[]?> GetObjectPrefixAsync(
        string objectKey,
        int maxBytes,
        CancellationToken cancellationToken = default)
    {
        if (maxBytes is < 1 or > 4096)
        {
            throw new ArgumentOutOfRangeException(nameof(maxBytes));
        }

        try
        {
            using var response = await _client.GetObjectAsync(new GetObjectRequest
            {
                BucketName = _options.Bucket,
                Key = objectKey,
                ByteRange = new ByteRange(0, maxBytes - 1)
            }, cancellationToken);
            using var buffer = new MemoryStream();
            await response.ResponseStream.CopyToAsync(buffer, cancellationToken);
            return buffer.ToArray();
        }
        catch (AmazonS3Exception exception) when (exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task EnsurePrivateBucketAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (_options.Provider == AssetStorageProvider.S3)
            {
                var response = await _client.GetPublicAccessBlockAsync(new GetPublicAccessBlockRequest
                {
                    BucketName = _options.Bucket
                }, cancellationToken);

                var block = response.PublicAccessBlockConfiguration;
                if (block is null
                    || block.BlockPublicAcls != true
                    || block.IgnorePublicAcls != true
                    || block.BlockPublicPolicy != true
                    || block.RestrictPublicBuckets != true)
                {
                    throw new AssetStorageUnavailableException("Required S3 public-access protections are not enabled.");
                }

                return;
            }

            await _client.DeleteBucketPolicyAsync(new DeleteBucketPolicyRequest
            {
                BucketName = _options.Bucket
            }, cancellationToken);
        }
        catch (AssetStorageUnavailableException)
        {
            throw;
        }
        catch (AmazonS3Exception exception) when (
            _options.Provider == AssetStorageProvider.Minio
            && exception.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // No bucket policy is the desired private default for local MinIO.
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new AssetStorageUnavailableException("Could not verify private asset storage.");
        }
    }

    public async Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        await _client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _options.Bucket,
            Key = objectKey
        }, cancellationToken);
    }

    private static Protocol GetMinioProtocol(string endpoint)
    {
        var endpointUri = new Uri(endpoint, UriKind.Absolute);
        return string.Equals(endpointUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            ? Protocol.HTTP
            : Protocol.HTTPS;
    }
}
