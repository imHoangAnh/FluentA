using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Countdown;

public interface ICountdownService
{
    Task<OperationResult<IReadOnlyList<CountdownEventDto>>> ListAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<CountdownEventDto>> CreateAsync(Guid userId, CreateCountdownEventRequest request, CancellationToken cancellationToken = default);

    Task<OperationResult<TrashEntryDto>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default);
}
