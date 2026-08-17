using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Trash;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/trash")]
public sealed class TrashController : ApiControllerBase
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

}
