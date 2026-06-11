using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Countdown;

public interface ICountdownService
{
    Task<OperationResult<IReadOnlyList<CountdownEventDto>>> ListAsync(Guid userId, CancellationToken cancellationToken = default);

    Task<OperationResult<CountdownEventDto>> CreateAsync(Guid userId, CreateCountdownEventRequest request, CancellationToken cancellationToken = default);

    Task<OperationResult<CountdownEventDto>> UpdateAsync(Guid userId, Guid countdownId, UpdateCountdownEventRequest request, CancellationToken cancellationToken = default);

    Task<OperationResult<bool>> DeleteAsync(Guid userId, Guid countdownId, CancellationToken cancellationToken = default);
}
