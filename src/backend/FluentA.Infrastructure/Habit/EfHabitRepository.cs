using FluentA.Application.BoundedContexts.Habit;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Infrastructure.Habit;

public sealed class EfHabitRepository : IHabitRepository
{
    private readonly AppDbContext _dbContext;

    public EfHabitRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<HabitEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.Habits
            .Where(habit => habit.UserId == userId && habit.DeletedAt == null)
            .OrderBy(habit => habit.CreatedAt)
            .ThenBy(habit => habit.Name)
            .ToListAsync(cancellationToken);
    }

    public Task<HabitEntity?> GetAsync(Guid userId, Guid habitId, CancellationToken cancellationToken = default)
    {
        return _dbContext.Habits
            .FirstOrDefaultAsync(
                habit => habit.Id == habitId
                    && habit.UserId == userId
                    && habit.DeletedAt == null,
                cancellationToken);
    }

    public async Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(
        Guid habitId,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        var start = NormalizeDate(startDate);
        var end = NormalizeDate(endDate);
        return await _dbContext.HabitEntries
            .Where(entry => entry.HabitId == habitId && entry.Date >= start && entry.Date <= end)
            .OrderBy(entry => entry.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<HabitEntry>> ListEntriesAsync(
        IReadOnlyCollection<Guid> habitIds,
        DateTime startDate,
        DateTime endDate,
        CancellationToken cancellationToken = default)
    {
        if (habitIds.Count == 0)
        {
            return [];
        }

        var start = NormalizeDate(startDate);
        var end = NormalizeDate(endDate);
        return await _dbContext.HabitEntries
            .Where(entry => habitIds.Contains(entry.HabitId) && entry.Date >= start && entry.Date <= end)
            .OrderBy(entry => entry.Date)
            .ToListAsync(cancellationToken);
    }

    public async Task AddAsync(HabitEntity habit, CancellationToken cancellationToken = default)
    {
        await _dbContext.Habits.AddAsync(habit, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(HabitEntity habit, CancellationToken cancellationToken = default)
    {
        _dbContext.Habits.Update(habit);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<bool> ToggleEntryAsync(Guid habitId, DateTime date, CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeDate(date);
        var existing = await _dbContext.HabitEntries
            .FirstOrDefaultAsync(entry => entry.HabitId == habitId && entry.Date == normalized, cancellationToken);

        if (existing is not null)
        {
            _dbContext.HabitEntries.Remove(existing);
            await _dbContext.SaveChangesAsync(cancellationToken);
            return false;
        }

        await _dbContext.HabitEntries.AddAsync(HabitEntry.Create(habitId, normalized), cancellationToken);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (DbUpdateException exception) when (IsUniqueViolation(exception))
        {
            _dbContext.ChangeTracker.Clear();
            return true;
        }
    }

    private static bool IsUniqueViolation(DbUpdateException exception)
    {
        return exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation };
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
