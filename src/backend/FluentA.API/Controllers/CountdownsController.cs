using System.Security.Claims;
using FluentA.API.Common;
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
public sealed class CountdownsController : ApiControllerBase
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
            ? Ok(ApiResponse<IReadOnlyList<CountdownEventDto>>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Creates a countdown for the authenticated user.</summary>
    [HttpPost]
    public async Task<IActionResult> Create(CreateCountdownEventRequest request, CancellationToken cancellationToken)
    {
        var result = await _countdowns.CreateAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? StatusCode(StatusCodes.Status201Created, ApiResponse<CountdownEventDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Hides an owned countdown after client confirmation while retaining its record and cover.</summary>
    [HttpDelete("{countdownId:guid}")]
    public async Task<IActionResult> Delete(Guid countdownId, CancellationToken cancellationToken)
    {
        var result = await _countdowns.DeleteAsync(CurrentUserId(), countdownId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiResponse<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }

}
