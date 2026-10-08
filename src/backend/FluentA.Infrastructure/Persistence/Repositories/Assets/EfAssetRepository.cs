using FluentA.Application.BoundedContexts.Assets;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Persistence.Repositories.Assets;

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
            asset => asset.Id == assetId && asset.UploadedByUserId == userId && asset.DeletedAt == null,
            cancellationToken);
    }

    public async Task<IReadOnlyList<Asset>> GetOwnedAsync(Guid userId, IReadOnlyCollection<Guid> assetIds, CancellationToken cancellationToken = default)
    {
        if (assetIds.Count == 0)
        {
            return [];
        }

        return await _dbContext.Assets
            .Where(asset => asset.UploadedByUserId == userId && asset.DeletedAt == null && assetIds.Contains(asset.Id))
            .ToListAsync(cancellationToken);
    }

    public Task UpdateAsync(Asset asset, CancellationToken cancellationToken = default)
    {
        _dbContext.Assets.Update(asset);
        return _dbContext.SaveChangesAsync(cancellationToken);
    }
}
