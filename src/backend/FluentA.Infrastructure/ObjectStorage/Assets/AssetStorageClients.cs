using Amazon.S3;

namespace FluentA.Infrastructure.ObjectStorage.Assets;

public sealed class AssetStorageClients : IDisposable
{
    private readonly bool _ownsClients;

    public AssetStorageClients(IAmazonS3 operations, IAmazonS3 presigning, bool ownsClients = true)
    {
        Operations = operations;
        Presigning = presigning;
        _ownsClients = ownsClients;
    }

    public IAmazonS3 Operations { get; }
    public IAmazonS3 Presigning { get; }

    public void Dispose()
    {
        if (!_ownsClients)
        {
            return;
        }

        if (!ReferenceEquals(Operations, Presigning))
        {
            Presigning.Dispose();
        }

        Operations.Dispose();
    }
}
