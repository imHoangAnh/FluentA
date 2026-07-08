using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Countdown;
using FluentA.Application.BoundedContexts.Countdown.DTOs;
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
            ? Ok(ApiEnvelope<object>.Ok(new { message = "Countdown deleted." }))
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
        if (result.Error is not CountdownError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
