using FluentA.Application.BoundedContexts.Trash;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using FluentA.Domain.BoundedContexts.Trash.Enums;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Trash;

public sealed class EfTrashRepository : ITrashRepository
{
    private readonly AppDbContext _dbContext;

    public EfTrashRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task AddAsync(TrashEntry entry, CancellationToken cancellationToken = default)
    {
        await _dbContext.TrashEntries.AddAsync(entry, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<TrashEntry>> ListActiveAsync(Guid userId, TrashEntityKind? kind, string? search, int limit, CancellationToken cancellationToken = default)
    {
        var query = _dbContext.TrashEntries.Where(entry => entry.UserId == userId && entry.State == TrashEntryState.Active);
        if (kind is not null)
        {
            query = query.Where(entry => entry.EntityKind == kind.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Replace("%", "\\%").Replace("_", "\\_")}%";
            query = query.Where(entry => EF.Functions.ILike(entry.DisplayName, pattern, "\\"));
        }

        return await query
            .OrderByDescending(entry => entry.TrashedAt)
            .ThenByDescending(entry => entry.Id)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public Task<TrashEntry?> ClaimOwnedAsync(Guid userId, Guid entryId, TrashEntryState claimState, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        return ClaimAsync(
            _dbContext.TrashEntries.Where(entry => entry.Id == entryId && entry.UserId == userId && entry.State == TrashEntryState.Active),
            entryId,
            claimState,
            nowUtc,
            cancellationToken);
    }

    public Task<TrashEntry?> ClaimDueAsync(Guid entryId, DateTime nowUtc, CancellationToken cancellationToken = default)
    {
        return ClaimAsync(
            _dbContext.TrashEntries.Where(entry => entry.Id == entryId && entry.State == TrashEntryState.Active && entry.PurgeAfterAt <= nowUtc),
            entryId,
            TrashEntryState.Purging,
            nowUtc,
            cancellationToken);
    }

    public async Task<IReadOnlyList<Guid>> ListDueEntryIdsAsync(DateTime nowUtc, int limit, CancellationToken cancellationToken = default)
    {
        return await _dbContext.TrashEntries
            .Where(entry => entry.State == TrashEntryState.Active && entry.PurgeAfterAt <= nowUtc)
            .OrderBy(entry => entry.PurgeAfterAt)
            .ThenBy(entry => entry.Id)
            .Select(entry => entry.Id)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    public async Task UpdateAsync(TrashEntry entry, CancellationToken cancellationToken = default)
    {
        _dbContext.TrashEntries.Update(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveAsync(TrashEntry entry, CancellationToken cancellationToken = default)
    {
        _dbContext.TrashEntries.Remove(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveActiveByEntityIdsAsync(Guid userId, TrashEntityKind kind, IReadOnlyCollection<Guid> entityIds, CancellationToken cancellationToken = default)
    {
        if (entityIds.Count == 0)
        {
            return;
        }

        await _dbContext.TrashEntries
            .Where(entry => entry.UserId == userId
                && entry.EntityKind == kind
                && entry.State == TrashEntryState.Active
                && entityIds.Contains(entry.EntityId))
            .ExecuteDeleteAsync(cancellationToken);
    }

    private async Task<TrashEntry?> ClaimAsync(
        IQueryable<TrashEntry> query,
        Guid entryId,
        TrashEntryState claimState,
        DateTime nowUtc,
        CancellationToken cancellationToken)
    {
        var claimed = await query.ExecuteUpdateAsync(
            updates => updates
                .SetProperty(entry => entry.State, claimState)
                .SetProperty(entry => entry.UpdatedAt, nowUtc),
            cancellationToken);
        if (claimed != 1)
        {
            return null;
        }

        return await _dbContext.TrashEntries.SingleAsync(entry => entry.Id == entryId && entry.State == claimState, cancellationToken);
    }
}
