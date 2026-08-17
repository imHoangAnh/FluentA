using System.Threading.RateLimiting;
using FluentA.API.Contracts;
using Microsoft.AspNetCore.RateLimiting;

namespace FluentA.API.Extensions;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddFluentARateLimiting(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            AddFixedWindowPolicy(options, "auth-login", 10, TimeSpan.FromMinutes(5));
            AddFixedWindowPolicy(options, "auth-register", 5, TimeSpan.FromMinutes(15));
            AddFixedWindowPolicy(options, "auth-forgot", 5, TimeSpan.FromMinutes(15));
            AddFixedWindowPolicy(options, "auth-resend", 5, TimeSpan.FromMinutes(15));
            AddFixedWindowPolicy(options, "auth-verify", 10, TimeSpan.FromMinutes(5));
            AddFixedWindowPolicy(options, "auth-reset", 10, TimeSpan.FromMinutes(15));
            AddFixedWindowPolicy(options, "auth-google", 20, TimeSpan.FromMinutes(5));
            options.OnRejected = async (context, cancellationToken) =>
            {
                var retryAfter = context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var duration)
                    ? Math.Max(1, (int)Math.Ceiling(duration.TotalSeconds))
                    : 60;
                context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
                context.HttpContext.Response.Headers.RetryAfter = retryAfter.ToString();
                await context.HttpContext.Response.WriteAsJsonAsync(
                    ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                        "RATE_LIMITED",
                        "Too many requests. Please try again later.",
                        new { retryAfterSeconds = retryAfter })),
                    cancellationToken);
            };
        });
        return services;
    }

    private static void AddFixedWindowPolicy(
        RateLimiterOptions options,
        string name,
        int permitLimit,
        TimeSpan window)
    {
        options.AddPolicy(name, httpContext => RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permitLimit,
                Window = window,
                QueueLimit = 0,
                AutoReplenishment = true
            }));
    }
}
