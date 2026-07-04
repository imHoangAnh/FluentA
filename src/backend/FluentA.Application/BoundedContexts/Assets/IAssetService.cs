using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Assets;

public interface IAssetService
{
    Task<OperationResult<IReadOnlyList<OwnedAssetDto>>> ListAsync(Guid userId, ListAssetsRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<PresignedAssetUploadDto>> PresignAsync(Guid userId, PresignAssetRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<AssetDto>> FinalizeAsync(Guid userId, FinalizeAssetRequest request, CancellationToken cancellationToken = default);
    Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default);
    Task<int> CleanupExpiredPendingAsync(CancellationToken cancellationToken = default);
}
