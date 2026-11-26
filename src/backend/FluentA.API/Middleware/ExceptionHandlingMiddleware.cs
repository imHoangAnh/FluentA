using FluentA.API.Contracts;
using FluentA.Domain.Exceptions;
using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.API.Middleware;

public sealed class ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception exception) when (!context.Response.HasStarted)
        {
            var (status, details) = exception switch
            {
                ValidationException validation => (400, (object?)validation.Errors),
                BadRequestException => (400, null),
                NotFoundException => (404, null),
                ForbiddenException => (403, null),
                ConflictException => (409, null),
                UnauthorizedException => (401, null),
                _ => (500, null)
            };

            if (status == 500) logger.LogError(exception, "Unhandled exception. TraceId: {TraceId}", context.TraceIdentifier);
            var code = exception is DomainException domainException ? domainException.Code : "INTERNAL_ERROR";
            var message = status == 500 ? "An unexpected error occurred." : exception.Message;
            context.Response.Clear();
            context.Response.StatusCode = status;
            await context.Response.WriteAsJsonAsync(ApiResponseFactory.Fail(code, message, details, context.TraceIdentifier));
        }
    }
}
