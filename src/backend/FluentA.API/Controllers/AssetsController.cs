using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/assets")]
public sealed class AssetsController : ControllerBase
{
    private readonly IAssetService _assets;

    public AssetsController(IAssetService assets)
    {
        _assets = assets;
    }

    /// <summary>Creates a presigned direct-upload target for a supported owned asset type.</summary>
    [HttpPost("presign")]
    public async Task<IActionResult> Presign(PresignAssetRequest request, CancellationToken cancellationToken)
    {
        var result = await _assets.PresignAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<PresignedAssetUploadDto>.Ok(result.Value!))
            : ToErrorResult(result);
    }

    /// <summary>Finalizes a previously presigned owned asset after object-storage verification.</summary>
    [HttpPost("finalize")]
    public async Task<IActionResult> Finalize(FinalizeAssetRequest request, CancellationToken cancellationToken)
    {
        var result = await _assets.FinalizeAsync(CurrentUserId(), request, cancellationToken);
        return result.IsSuccess
            ? Ok(ApiEnvelope<AssetDto>.Ok(result.Value!))
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
        if (result.Error is not AssetError error)
        {
            return StatusCode(500, ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
        }

        return StatusCode(error.StatusCode, ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
    }
}
