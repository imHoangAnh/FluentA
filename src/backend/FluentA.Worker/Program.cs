using FluentA.Infrastructure;
using FluentA.Infrastructure.Persistence;
using Hangfire;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddFluentAInfrastructure(builder.Configuration);
builder.Services.AddFluentAHangfireWorker(builder.Configuration);
builder.Services.AddHostedService<HangfireWorkerHostedService>();

var app = builder.Build();

app.MapGet("/health/live", () => Results.Ok(new { status = "live" }));
app.MapGet("/health/ready", async (AppDbContext dbContext, IServiceProvider services, CancellationToken cancellationToken) =>
{
    try
    {
        if (!await dbContext.Database.CanConnectAsync(cancellationToken))
        {
            return Results.Problem("PostgreSQL is not reachable.", statusCode: StatusCodes.Status503ServiceUnavailable);
        }
    }
    catch (Exception ex)
    {
        return Results.Problem(
            $"PostgreSQL is not reachable: {ex.Message}",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    try
    {
        var jobStorage = services.GetRequiredService<JobStorage>();
        jobStorage.GetMonitoringApi().Servers();
    }
    catch (Exception ex)
    {
        return Results.Problem(
            $"Hangfire storage is not reachable: {ex.Message}",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }

    return Results.Ok(new { status = "ready" });
});

app.Run();
