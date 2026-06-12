using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Pomodoro.DTOs;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/pomodoro")]
public sealed class PomodoroController : ControllerBase
{
    private readonly IPomodoroService _pomodoro;

    public PomodoroController(IPomodoroService pomodoro)
    {
        _pomodoro = pomodoro;
    }

    /// <summary>Gets or creates the authenticated user's Pomodoro configuration.</summary>
    [HttpGet("config")]
    public async Task<IActionResult> GetConfig(CancellationToken cancellationToken)
    {
        var result = await _pomodoro.GetConfigAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PomodoroConfigDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Updates supplied fields on the authenticated user's Pomodoro configuration.</summary>
    [HttpPatch("config")]
    public async Task<IActionResult> UpdateConfig(UpdatePomodoroConfigRequest request, CancellationToken cancellationToken)
    {
        var result = await _pomodoro.UpdateConfigAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PomodoroConfigDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets the authenticated user's current Pomodoro timer state.</summary>
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var result = await _pomodoro.GetCurrentAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PomodoroCurrentStateDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Gets the authenticated user's completed work-session count for the client-local day.</summary>
    [HttpGet("today")]
    public async Task<IActionResult> GetToday([FromQuery] int utcOffsetMinutes = 0, CancellationToken cancellationToken = default)
    {
        var result = await _pomodoro.GetTodayAsync(CurrentUserId(), utcOffsetMinutes, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PomodoroTodayDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Starts an idle Pomodoro work timer.</summary>
    [HttpPost("start")]
    public async Task<IActionResult> Start([FromBody] StartPomodoroRequest request, CancellationToken cancellationToken) =>
        ToStateResult(await _pomodoro.StartAsync(CurrentUserId(), request, cancellationToken));

    /// <summary>Pauses a running Pomodoro timer.</summary>
    [HttpPost("pause")]
    public async Task<IActionResult> Pause(CancellationToken cancellationToken) =>
        ToStateResult(await _pomodoro.PauseAsync(CurrentUserId(), cancellationToken));

    /// <summary>Resumes a paused Pomodoro timer.</summary>
    [HttpPost("resume")]
    public async Task<IActionResult> Resume(CancellationToken cancellationToken) =>
        ToStateResult(await _pomodoro.ResumeAsync(CurrentUserId(), cancellationToken));

    /// <summary>Resets the current Pomodoro timer to idle work state.</summary>
    [HttpPost("reset")]
    public async Task<IActionResult> Reset(CancellationToken cancellationToken) =>
        ToStateResult(await _pomodoro.ResetAsync(CurrentUserId(), cancellationToken));

    /// <summary>Completes the current phase and starts the next Pomodoro phase.</summary>
    [HttpPost("complete")]
    public async Task<IActionResult> Complete(CancellationToken cancellationToken) =>
        ToStateResult(await _pomodoro.CompleteAsync(CurrentUserId(), cancellationToken));

    private IActionResult ToStateResult(OperationResult<PomodoroCurrentStateDto> result)
    {
        return result.IsSuccess
            ? Ok(ApiEnvelope<PomodoroCurrentStateDto>.Ok(result.Value!))
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
        if (result.Error is not PomodoroError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
