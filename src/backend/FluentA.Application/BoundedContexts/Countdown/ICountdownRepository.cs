using CountdownEventEntity = FluentA.Domain.BoundedContexts.Countdown.Entities.CountdownEvent;

namespace FluentA.Application.BoundedContexts.Countdown;

public interface ICountdownRepository
{
    Task<IReadOnlyList<CountdownEventEntity>> ListAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<CountdownEventEntity?> GetAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default);
    Task<CountdownEventEntity?> GetTrashedAsync(Guid userId, Guid countdownId, DateTime trashedAt, CancellationToken cancellationToken = default);

    Task<bool> IsCoverAssetAttachedAsync(Guid coverAssetId, CancellationToken cancellationToken = default);

    Task AddAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default);

    Task UpdateAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default);
    Task RemoveAsync(CountdownEventEntity countdownEvent, CancellationToken cancellationToken = default);
}
