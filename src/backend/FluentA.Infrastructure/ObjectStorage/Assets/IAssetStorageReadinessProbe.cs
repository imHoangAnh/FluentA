namespace FluentA.Infrastructure.ObjectStorage.Assets;

public interface IAssetStorageReadinessProbe
{
    Task VerifyAsync(CancellationToken cancellationToken = default);
}
