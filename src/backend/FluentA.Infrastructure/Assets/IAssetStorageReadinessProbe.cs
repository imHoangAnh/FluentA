namespace FluentA.Infrastructure.Assets;

public interface IAssetStorageReadinessProbe
{
    Task VerifyAsync(CancellationToken cancellationToken = default);
}
