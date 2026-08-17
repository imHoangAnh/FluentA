using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.Common;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Common;

public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedAccessException("Missing authenticated user id.");
        }

        return id;
    }

    protected IActionResult ToErrorResult<T>(OperationResult<T> result) =>
        ApiErrorMapper.ToActionResult(this, result);
}

public static class ApiErrorMapper
{
    public static IActionResult ToActionResult<T>(ControllerBase controller, OperationResult<T> result)
    {
        if (result.Error is IApplicationError error)
        {
            return controller.StatusCode(
                error.StatusCode,
                ApiEnvelope<object>.Fail(new ApiErrorEnvelope(error.Code, error.Message, error.Details)));
        }

        return controller.StatusCode(
            500,
            ApiEnvelope<object>.Fail(new ApiErrorEnvelope("INTERNAL_ERROR", "An unexpected error occurred.")));
    }
}
