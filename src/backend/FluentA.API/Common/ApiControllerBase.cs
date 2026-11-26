using System.Security.Claims;
using FluentA.API.Contracts;
using FluentA.Application.Common;
using FluentA.Domain.Exceptions;
using Microsoft.AspNetCore.Mvc;

namespace FluentA.API.Common;

public abstract class ApiControllerBase : ControllerBase
{
    protected Guid CurrentUserId()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!Guid.TryParse(userId, out var id))
        {
            throw new UnauthorizedException("Missing authenticated user id.");
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
        if (result.Error is { } error)
        {
            return controller.StatusCode(
                error.StatusCode,
                ApiResponseFactory.Fail(error.Code, error.Message, error.Details, controller.HttpContext.TraceIdentifier));
        }

        return controller.StatusCode(
            500,
            ApiResponseFactory.Fail("INTERNAL_ERROR", "An unexpected error occurred.", traceId: controller.HttpContext.TraceIdentifier));
    }
}
