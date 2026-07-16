using Amazon.S3;
using Amazon.S3.Model;
using FluentA.Application.BoundedContexts.Assets;
using Protocol = Amazon.S3.Protocol;

namespace FluentA.Infrastructure.Assets;

public sealed class MinioAssetObjectStorage : IAssetObjectStorage
{
    private readonly IAmazonS3 _client;
    private readonly AssetStorageOptions _options;
    private readonly Protocol _presignProtocol;

    public MinioAssetObjectStorage(IAmazonS3 client, AssetStorageOptions options)
    {
        _client = client;
        _options = options;
        _options.Validate();
        var endpoint = new Uri(_options.Endpoint, UriKind.Absolute);
        _presignProtocol = string.Equals(endpoint.Scheme, Uri.UriSchemeHttp, StringComparison.OrdinalIgnoreCase)
            ? Protocol.HTTP
            : Protocol.HTTPS;
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

        return new AssetPresignedUpload(url, expiresAtUtc);
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

    public async Task<AssetObjectMetadata?> GetObjectMetadataAsync(string objectKey, CancellationToken cancellationToken = default)
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
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<byte[]?> GetObjectPrefixAsync(string objectKey, int maxBytes, CancellationToken cancellationToken = default)
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
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public string GetPublicUrl(string objectKey)
    {
        return $"{_options.PublicBaseUrl.TrimEnd('/')}/{_options.Bucket}/{EscapeObjectKey(objectKey)}";
    }

    public async Task DeleteIfExistsAsync(string objectKey, CancellationToken cancellationToken = default)
    {
        await _client.DeleteObjectAsync(new DeleteObjectRequest
        {
            BucketName = _options.Bucket,
            Key = objectKey
        }, cancellationToken);
    }

    private static string EscapeObjectKey(string objectKey)
    {
        return string.Join("/", objectKey.Split('/', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(Uri.EscapeDataString));
    }
}
