using System.Diagnostics;
using System.Security.Claims;

namespace FluentA.API.Middleware;

public sealed class RequestLogMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestLogMiddleware> _logger;

    public RequestLogMiddleware(RequestDelegate next, ILogger<RequestLogMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = Stopwatch.StartNew();
        await _next(context);
        sw.Stop();

        _logger.LogInformation(
            "request_id={RequestId} user_id={UserId} action={Method} {Path} duration_ms={DurationMs} status_code={StatusCode} message={Message}",
            context.TraceIdentifier,
            context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "anonymous",
            context.Request.Method,
            context.Request.Path,
            sw.ElapsedMilliseconds,
            context.Response.StatusCode,
            "request completed");
    }
}
