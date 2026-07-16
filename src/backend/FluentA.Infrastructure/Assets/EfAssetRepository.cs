using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Assets;

public sealed class EfAssetRepository : IAssetRepository
{
    private readonly AppDbContext _dbContext;

    public EfAssetRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(Asset asset, CancellationToken cancellationToken = default)
    {
        await _dbContext.Assets.AddAsync(asset, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<Asset?> GetByIdAsync(Guid assetId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Assets.FirstOrDefaultAsync(asset => asset.Id == assetId, cancellationToken);
    }

    public Task<Asset?> GetOwnedAsync(Guid userId, Guid assetId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Assets.FirstOrDefaultAsync(
            asset => asset.Id == assetId && asset.UserId == userId && asset.DeletedAt == null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
    {
        if (assetIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.Assets
            .Where(asset => asset.UserId == userId && asset.DeletedAt == null && assetIds.Contains(asset.Id))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Asset>> ListOwnedAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Assets
            .Where(asset => asset.UserId == userId && asset.DeletedAt == null)
            .OrderByDescending(asset => asset.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Asset>> ListPendingCleanupCandidatesAsync(DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Assets
            .Where(asset => asset.DeletedAt == null
                && (asset.Status == FluentA.Domain.BoundedContexts.Assets.Enums.AssetStatus.Failed
                    || (asset.Status == FluentA.Domain.BoundedContexts.Assets.Enums.AssetStatus.PendingUpload
                        && asset.ExpiresAt.HasValue
                        && asset.ExpiresAt.Value <= nowUtc)))
            .OrderBy(asset => asset.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<Asset>> ClaimDueArchivedAsync(DateTime nowUtc, int batchSize, CancellationToken cancellationToken = default)
    {
        var candidateIds = await _dbContext.Assets
            .Where(asset => asset.Status == FluentA.Domain.BoundedContexts.Assets.Enums.AssetStatus.Archived
                && asset.PurgeAfterAt.HasValue
                && asset.PurgeAfterAt.Value <= nowUtc)
            .OrderBy(asset => asset.PurgeAfterAt)
            .Select(asset => asset.Id)
            .Take(batchSize)
            .ToListAsync(cancellationToken);

        var claimedIds = new List<Guid>();
        foreach (var id in candidateIds)
        {
            var updated = await _dbContext.Assets
                .Where(asset => asset.Id == id
                    && asset.Status == FluentA.Domain.BoundedContexts.Assets.Enums.AssetStatus.Archived
                    && asset.PurgeAfterAt.HasValue
                    && asset.PurgeAfterAt.Value <= nowUtc)
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(asset => asset.Status, FluentA.Domain.BoundedContexts.Assets.Enums.AssetStatus.PendingDeletion)
                    .SetProperty(asset => asset.UpdatedAt, nowUtc), cancellationToken);
            if (updated == 1) claimedIds.Add(id);
        }

        return await _dbContext.Assets.Where(asset => claimedIds.Contains(asset.Id)).ToListAsync(cancellationToken);
    }

    public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default)
    {
        _dbContext.Assets.Update(asset);
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
