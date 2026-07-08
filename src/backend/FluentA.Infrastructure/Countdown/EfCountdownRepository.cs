using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Infrastructure.Countdown;

public sealed class EfCountdownRepository : ICountdownRepository
{
    private readonly AppDbContext _dbContext;

    public EfCountdownRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<IReadOnlyList<CountdownEventEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        return await _dbContext.CountdownEvents
            .Include(countdownEvent => countdownEvent.Alerts)
            .Where(countdownEvent => countdownEvent.UserId == userId && countdownEvent.DeletedAt == null)
            .OrderBy(countdownEvent => countdownEvent.TargetDate)
            .ThenBy(countdownEvent => countdownEvent.CreatedAt)
            .ToListAsync(cancellationToken);
    }

    public Task<CountdownEventEntity?> GetAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default)
    {
        return _dbContext.CountdownEvents
            .Include(countdownEvent => countdownEvent.Alerts)
            .FirstOrDefaultAsync(
                countdownEvent => countdownEvent.Id == countdownId
                    && countdownEvent.UserId == userId
                    && countdownEvent.DeletedAt == null,
                cancellationToken);
    }

    public async Task AddAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
    {
        await _dbContext.CountdownEvents.AddAsync(countdownEvent, cancellationToken);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task UpdateAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default)
    {
        _dbContext.CountdownEvents.Update(countdownEvent);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
