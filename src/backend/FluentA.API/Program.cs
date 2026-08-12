using System.Net;
using System.Text;
using System.Threading.RateLimiting;
using FluentA.API.BackgroundJobs;
using FluentA.API.Configuration;
using FluentA.API.Contracts;
using FluentA.API.Health;
using FluentA.API.Hubs;
using FluentA.API.Middleware;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.Application.BoundedContexts.Habit;
using FluentA.Application.BoundedContexts.Project;
using FluentA.Application.BoundedContexts.Pomodoro;
using FluentA.Application.BoundedContexts.Todo;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Auth;
using Hangfire;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
var authOptions = AuthSecurityOptions.FromConfiguration(builder.Configuration);
authOptions.Validate();
ProductionRuntimeValidator.Validate(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
builder.Services.AddFluentAInfrastructure(builder.Configuration);
builder.Services.AddHealthChecks()
    .AddCheck("self", () => HealthCheckResult.Healthy(), tags: ["live", "ready"])
    .AddCheck<PostgresReadinessCheck>(
        "postgres",
        failureStatus: HealthStatus.Unhealthy,
        tags: ["ready"],
        timeout: TimeSpan.FromSeconds(5))
    .AddCheck<AssetStorageReadinessCheck>(
        "asset-storage",
        failureStatus: HealthStatus.Unhealthy,
        tags: ["ready"],
        timeout: TimeSpan.FromSeconds(5));
builder.Services.AddScoped<IFlashcardSyncNotifier, SignalRFlashcardSyncNotifier>();
builder.Services.AddScoped<ITodoSyncNotifier, SignalRTodoSyncNotifier>();
builder.Services.AddScoped<IHabitSyncNotifier, SignalRHabitSyncNotifier>();
builder.Services.AddScoped<IProjectSyncNotifier, SignalRProjectSyncNotifier>();
builder.Services.AddScoped<IPomodoroSyncNotifier, SignalRPomodoroSyncNotifier>();

var frontendOrigins = builder.Configuration.GetSection("Frontend:Origins").Get<string[]>()
    ?? ["https://localhost:5173", "https://127.0.0.1:5173"];
builder.Services.AddCors(options => options.AddPolicy("FluentAPolicy", policy => policy
    .WithOrigins(frontendOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    foreach (var configuredProxy in builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
    {
        if (IPAddress.TryParse(configuredProxy, out var address)) options.KnownProxies.Add(address);
    }
});

builder.Services.AddRateLimiter(options =>
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
        await context.HttpContext.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
            "RATE_LIMITED",
            "Too many requests. Please try again later.",
            new { retryAfterSeconds = retryAfter })), cancellationToken);
    };
});

var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(authOptions.JwtKey));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidIssuer = authOptions.JwtIssuer,
        ValidateAudience = true,
        ValidAudience = authOptions.JwtAudience,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = signingKey,
        ValidateLifetime = true,
        ClockSkew = TimeSpan.FromMinutes(1)
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            context.Token = context.Request.Cookies["access_token"];
            return Task.CompletedTask;
        },
        OnChallenge = async context =>
        {
            context.HandleResponse();
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                "UNAUTHORIZED", "Missing or invalid authentication credentials.")));
        }
    };
});
builder.Services.AddAuthorization();

var app = builder.Build();
if (app.Environment.IsDevelopment()) app.MapOpenApi();

app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
{
    context.Response.StatusCode = StatusCodes.Status500InternalServerError;
    await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
        "INTERNAL_ERROR", "An unexpected error occurred.")));
}));

app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseCors("FluentAPolicy");
app.UseMiddleware<RequestLogMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapHealthChecks("/health/live", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("live"),
    ResponseWriter = HealthResponseWriter.WriteAsync
}).AllowAnonymous();
app.MapHealthChecks("/health/ready", new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
    ResponseWriter = HealthResponseWriter.WriteAsync
}).AllowAnonymous();
app.MapControllers();
app.MapHub<SyncHub>("/hubs/sync");
RecurringJobRegistration.Register(app.Services.GetRequiredService<IRecurringJobManager>());
app.Run();

static void AddFixedWindowPolicy(RateLimiterOptions options, string name, int permitLimit, TimeSpan window)
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

public partial class Program;
