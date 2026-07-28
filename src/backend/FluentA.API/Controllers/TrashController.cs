using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/trash")]
public sealed class TrashController : ControllerBase
{
    private readonly ITrashService _trash;

    public TrashController(ITrashService trash)
    {
        _trash = trash;
    }

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] string? type, [FromQuery] string? query, [FromQuery] int limit = 50, CancellationToken cancellationToken = default)
    {
        var result = await _trash.ListAsync(CurrentUserId(), type, query, limit, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<TrashListDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    [HttpPost("{entryId:guid}/restore")]
    public async Task<IActionResult> Restore(Guid entryId, RestoreTrashRequest? request, CancellationToken cancellationToken)
    {
        var result = await _trash.RestoreAsync(CurrentUserId(), entryId, request?.TimeZoneId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { restored = true }))
            : ToErrorResult(result);
    }

    [HttpDelete("{entryId:guid}")]
    public async Task<IActionResult> PermanentlyDelete(Guid entryId, CancellationToken cancellationToken)
    {
        var result = await _trash.PermanentlyDeleteAsync(CurrentUserId(), entryId, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<object>.Ok(new { deleted = true }))
            : ToErrorResult(result);
    }

    [HttpPost("bulk-restore")]
    public async Task<IActionResult> BulkRestore(TrashBulkRequest request, CancellationToken cancellationToken)
    {
        var result = await _trash.BulkRestoreAsync(CurrentUserId(), request.EntryIds, request.TimeZoneId, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<TrashBulkResult>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpPost("bulk-delete")]
    public async Task<IActionResult> BulkPermanentlyDelete(TrashBulkRequest request, CancellationToken cancellationToken)
    {
        var result = await _trash.BulkPermanentlyDeleteAsync(CurrentUserId(), request.EntryIds, cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<TrashBulkResult>.Ok(result.Value!)) : ToErrorResult(result);
    }

    [HttpDelete]
    public async Task<IActionResult> EmptyTrash(CancellationToken cancellationToken)
    {
        var result = await _trash.EmptyAsync(CurrentUserId(), cancellationToken);
        return result.IsSuccess ? Ok(ApiEnvelope<TrashBulkResult>.Ok(result.Value!)) : ToErrorResult(result);
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
        if (result.Error is TrashError error)
        {
            return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message)));
        }

        return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
    }
}
