using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using Protocol = Amazon.S3.Protocol;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class S3CompatibleAssetObjectStorage : IAssetObjectStorage
{
    private readonly IAmazonS3 _operations;
    private readonly IAmazonS3 _presigning;
    private readonly AssetStorageOptions _options;
    private readonly Protocol _presignProtocol;

    public S3CompatibleAssetObjectStorage(AssetStorageClients clients, AssetStorageOptions options)
    {
        _operations = clients.Operations;
        _presigning = clients.Presigning;
        _options = options;
        _options.Validate();
        _presignProtocol = GetProtocol(options.PresigningEndpoint);
    }

    public S3CompatibleAssetObjectStorage(IAmazonS3 client, AssetStorageOptions options)
        : this(new AssetStorageClients(client, client, ownsClients: false), options)
    {
    }

    public AssetPresignedUpload CreatePresignedUpload(AssetUploadRequest request)
    {
        var expiresAtUtc = DateTime.UtcNow.Add(request.Lifetime);
        var url = _presigning.GetPreSignedURL(new GetPreSignedUrlRequest
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
        var url = _presigning.GetPreSignedURL(new GetPreSignedUrlRequest
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
            var response = await _operations.GetObjectMetadataAsync(new GetObjectMetadataRequest
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
            using var response = await _operations.GetObjectAsync(new GetObjectRequest
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

    public async Task VerifyBucketAccessAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            await _operations.GetBucketLocationAsync(new GetBucketLocationRequest
            {
                BucketName = _options.Bucket
            }, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            throw new AssetStorageUnavailableException("Could not access asset storage.");
        }
    }

    public async Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        await _operations.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _options.Bucket,
            Key = objectKey
        }, cancellationToken);
    }

    private static Protocol GetProtocol(string endpoint)
    {
        if (string.IsNullOrWhiteSpace(endpoint))
        {
            return Protocol.HTTPS;
        }

        var endpointUri = new Uri(endpoint, UriKind.Absolute);
        return string.Equals(endpointUri.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            ? Protocol.HTTP
            : Protocol.HTTPS;
    }
}
