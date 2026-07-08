using FluentA.Application.BoundedContexts.Journal;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FluentA.Infrastructure.Journal;

public sealed class EfJournalRepository : IJournalRepository
{
    private readonly AppDbContext _dbContext;

    public EfJournalRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<JournalEntryListItem>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.JournalEntries
            .Where(entry => entry.UserId == userId && entry.DeletedAt == null)
            .OrderByDescending(entry => entry.CreatedAt)
            .ThenByDescending(entry => entry.Id)
            .Select(entry => new JournalEntryListItem(
                entry.Id,
                entry.Title,
                entry.Date,
                entry.CreatedAt,
                entry.UpdatedAt))
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<JournalEntrySearchItem>> SearchAsync(
        Guid userId,
        string query,
        CancellationToken cancellationToken = default)
    {
        var escaped = query
            .Replace(@"\", @"\\", StringComparison.Ordinal)
            .Replace("%", @"\%", StringComparison.Ordinal)
            .Replace("_", @"\_", StringComparison.Ordinal);
        var pattern = $"%{escaped}%";

        return await _dbContext.JournalEntries
            .Where(entry =>
                entry.UserId == userId &&
                entry.DeletedAt == null &&
                EF.Functions.ILike(entry.Title, pattern, @"\"))
            .OrderByDescending(entry => entry.CreatedAt)
            .ThenByDescending(entry => entry.Id)
            .Take(50)
            .Select(entry => new JournalEntrySearchItem(
                entry.Id,
                entry.Title,
                entry.Date,
                entry.CreatedAt,
                entry.UpdatedAt))
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<JournalCalendarDayItem>> CalendarAsync(
        Guid userId,
        DateTime monthStart,
        DateTime monthEnd,
        CancellationToken cancellationToken = default)
    {
        return await _dbContext.JournalEntries
            .Where(entry =>
                entry.UserId == userId &&
                entry.DeletedAt == null &&
                entry.Date >= monthStart &&
                entry.Date < monthEnd)
            .GroupBy(entry => entry.Date)
            .OrderBy(group => group.Key)
            .Select(group => new JournalCalendarDayItem(group.Key, group.Count()))
            .AsNoTracking()
            .ToListAsync(cancellationToken);
    }

    public Task<JournalEntry?> GetAsync(Guid userId, Guid journalId, CancellationToken cancellationToken = default)
    {
        return _dbContext.JournalEntries
            .FirstOrDefaultAsync(entry => entry.Id == journalId && entry.UserId == userId && entry.DeletedAt == null, cancellationToken);
    }

    public async Task AddAsync(JournalEntry entry, CancellationToken cancellationToken = default)
    {
        await _dbContext.JournalEntries.AddAsync(entry, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(JournalEntry entry, CancellationToken cancellationToken = default)
    {
        _dbContext.JournalEntries.Update(entry);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
