using System.Security.Claims;
using FluentA.API.Common;
using FluentA.API.Contracts;
using FluentA.Application.BoundedContexts.Assets;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Controllers;

[Authorize]
[ApiController]
[Route("api/v1/assets")]
public sealed class AssetsController : ApiControllerBase
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

}
