using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Domain.BoundedContexts.Pomodoro.Entities;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace FluentA.Infrastructure.Pomodoro;

public sealed class EfPomodoroRepository : IPomodoroRepository
{
    private readonly AppDbContext _dbContext;

    public EfPomodoroRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<PomodoroConfig?> GetConfigAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return _dbContext.PomodoroConfigs
            .FirstOrDefaultAsync(config => config.UserId == userId && config.DeletedAt == null, cancellationToken);
    }

    public async Task<PomodoroConfig> AddConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default)
    {
        await _dbContext.PomodoroConfigs.AddAsync(config, cancellationToken);
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
            return config;
        }
        catch (DbUpdateException exception) when (exception.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            _dbContext.Entry(config).State = EntityState.Detached;
            return await _dbContext.PomodoroConfigs
                .SingleAsync(existing => existing.UserId == config.UserId && existing.DeletedAt == null, cancellationToken);
        }
    }

    public async Task UpdateConfigAsync(PomodoroConfig config, CancellationToken cancellationToken = default)
    {
        _dbContext.PomodoroConfigs.Update(config);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task AddSessionAsync(PomodoroSession session, CancellationToken cancellationToken = default)
    {
        await _dbContext.PomodoroSessions.AddAsync(session, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public Task<int> CountCompletedWorkSessionsAsync(
        Guid userId,
        DateTime? fromUtc = null,
        DateTime? toUtc = null,
        CancellationToken cancellationToken = default)
    {
        var query = _dbContext.PomodoroSessions
            .Where(session => session.UserId == userId
                && session.DeletedAt == null
                && session.Phase == PomodoroPhase.Work
                && session.State == PomodoroState.Completed);
        if (fromUtc is not null) query = query.Where(session => session.CompletedAt >= fromUtc.Value);
        if (toUtc is not null) query = query.Where(session => session.CompletedAt < toUtc.Value);
        return query.CountAsync(cancellationToken);
    }
}
