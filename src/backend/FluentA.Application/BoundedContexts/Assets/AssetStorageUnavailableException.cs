namespace FluentA.Application.BoundedContexts.Assets;

public sealed class AssetStorageUnavailableException : Exception
{
    public AssetStorageUnavailableException(string message)
        : base(message)
    {
    }
}
