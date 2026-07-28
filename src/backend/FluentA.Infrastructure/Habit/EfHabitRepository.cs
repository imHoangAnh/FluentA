using FluentA.Application.BoundedContexts.Habit;
using FluentA.Domain.BoundedContexts.Habit.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
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

    public Task<HabitEntity?> GetTrashedAsync(Guid userId, Guid habitId, DateTime trashedAt, CancellationToken cancellationToken = default)
    {
        return _dbContext.Habits.FirstOrDefaultAsync(
            habit => habit.Id == habitId
                && habit.UserId == userId
                && habit.DeletedAt == trashedAt,
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

    public Task<int> CountEntriesAsync(Guid habitId, CancellationToken cancellationToken = default)
    {
        return _dbContext.HabitEntries.CountAsync(
            entry => entry.HabitId == habitId && entry.DeletedAt == null,
            cancellationToken);
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

    public async Task RemoveAsync(HabitEntity habit, CancellationToken cancellationToken = default)
    {
        _dbContext.Habits.Remove(habit);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<HabitEntryMutationResult> ToggleEntryAsync(
        Guid userId,
        Guid habitId,
        DateTime date,
        CancellationToken cancellationToken = default)
    {
        var normalized = NormalizeDate(date);
        await using var transaction = await _dbContext.Database.BeginTransactionAsync(cancellationToken);
        var habit = await _dbContext.Habits
            .FromSqlInterpolated($"SELECT * FROM habits WHERE id = {habitId} AND user_id = {userId} AND deleted_at IS NULL FOR UPDATE")
            .SingleOrDefaultAsync(cancellationToken);

        if (habit is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new HabitEntryMutationResult(HabitEntryMutationStatus.NotFound, 0, null);
        }

        var existing = await _dbContext.HabitEntries
            .FirstOrDefaultAsync(
                entry => entry.HabitId == habitId
                    && entry.Date == normalized
                    && entry.DeletedAt == null,
                cancellationToken);
        var currentCount = await _dbContext.HabitEntries.CountAsync(
            entry => entry.HabitId == habitId && entry.DeletedAt == null,
            cancellationToken);

        if (existing is not null)
        {
            _dbContext.HabitEntries.Remove(existing);
            await _dbContext.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);
            return new HabitEntryMutationResult(
                HabitEntryMutationStatus.Unchecked,
                Math.Max(0, currentCount - 1),
                habit.GoalDays);
        }

        if (!habit.IsStartedOn(normalized))
        {
            await transaction.RollbackAsync(cancellationToken);
            return new HabitEntryMutationResult(HabitEntryMutationStatus.BeforeStart, currentCount, habit.GoalDays);
        }

        if (!habit.IsScheduledOn(normalized))
        {
            await transaction.RollbackAsync(cancellationToken);
            return new HabitEntryMutationResult(HabitEntryMutationStatus.Unscheduled, currentCount, habit.GoalDays);
        }

        if (habit.GoalDays.HasValue && currentCount >= habit.GoalDays.Value)
        {
            await transaction.RollbackAsync(cancellationToken);
            return new HabitEntryMutationResult(HabitEntryMutationStatus.GoalReached, currentCount, habit.GoalDays);
        }

        await _dbContext.HabitEntries.AddAsync(HabitEntry.Create(habitId, normalized), cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return new HabitEntryMutationResult(HabitEntryMutationStatus.Checked, currentCount + 1, habit.GoalDays);
    }

    private static DateTime NormalizeDate(DateTime date)
    {
        return DateTime.SpecifyKind(date.Date, DateTimeKind.Utc);
    }
}
