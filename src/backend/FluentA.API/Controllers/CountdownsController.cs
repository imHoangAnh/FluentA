using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/countdowns")]
public sealed class CountdownsController : ControllerBase
{
    private readonly ICountdownService _countdowns;

    public CountdownsController(ICountdownService countdowns)
    {
        _countdowns = countdowns;
    }

    /// <summary>Lists countdowns for the authenticated user.</summary>
    [HttpGet]
    public async Task<IActionResult> List(CancellationToken cancellationToken)
    {
        var result = await _countdowns.ListAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<IReadOnlyList<CountdownEventDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a countdown for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateCountdownEventRequest request, CancellationToken cancellationToken)
    {
        var result = await _countdowns.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiEnvelope<CountdownEventDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Soft-deletes an owned countdown.</summary>
    [HttpDelete("{countdownId:guid}")]
    public async Task<IActionResult> Delete(Guid countdownId, CancellationToken cancellationToken)
    {
        var result = await _countdowns.DeleteAsync(CurrentUserId(), countdownId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashEntryDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    private Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedAccessException("Missing authenticated user id.");
        }

        return id;
    }

    private IActionResult ToErrorResult<T>(OperationResult<T> result)
    {
        var error = result.Error switch
        {
            CountdownError countdownError => new ApiErrorEnvelope(countdownError.Code, countdownError.Message, countdownError.Details),
            TrashError trashError => new ApiErrorEnvelope(trashError.Code, trashError.Message),
            _ => null,
        };
        var statusCode = result.Error switch
        {
            CountdownError countdownError => countdownError.StatusCode,
            TrashError trashError => trashError.StatusCode,
            _ => 500,
        };
        if (error is null)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }
        return StatusCode(statusCode, ApiEnvelope<object>.Fail(error));
    }
}
