using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace FluentA.API.Health;

public static class HealthResponseWriter
{
    public static Task WriteAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json; charset=utf-8";
        var status = report.Status switch
        {
            HealthStatus.Healthy => "Healthy",
            HealthStatus.Degraded => "Degraded",
            _ => "Unhealthy"
        };

        return context.Response.WriteAsync($$"""{"status":"{{status}}"}""");
    }
}
