using FluentA.Domain.BoundedContexts.Assets.Entities;

namespace FluentA.Application.BoundedContexts.Assets;

public interface IAssetRepository
{
    Task AddAsync(Asset asset, CancellationToken cancellationToken = default);
    Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default);
    Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Asset>> ListOwnedAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<Asset>> ClaimDueArchivedAsync(DateTime nowUtc, int batchSize, CancellationToken cancellationToken = default) =>
        Task.FromResult<IReadOnlyList<Asset>>([]);
    Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default);
}
