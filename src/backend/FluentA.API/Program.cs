using System.Net;
using FluentA.API.BackgroundJobs;
using FluentA.API.Configuration;
using FluentA.API.Extensions;
using FluentA.API.Hubs;
using FluentA.API.Middleware;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Identity;
using Hangfire;
using Microsoft.AspNetCore.HttpOverrides;

var builder = WebApplication.CreateBuilder(args);
var authOptions = AuthSecurityOptions.FromConfiguration(builder.Configuration);
authOptions.Validate();
ProductionRuntimeValidator.Validate(builder.Configuration, builder.Environment);

builder.Services.AddControllers();
builder.Services.AddFluentAOpenApi();
builder.Services.AddFluentAInfrastructure(builder.Configuration);
builder.Services.AddFluentAHealthChecks();
builder.Services.AddFluentARealtime();
builder.Services.AddFluentACors(builder.Configuration);
builder.Services.AddFluentARateLimiting();
builder.Services.AddFluentAAuthentication(authOptions);

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.ForwardLimit = 1;
    foreach (var configuredProxy in builder.Configuration.GetSection("ForwardedHeaders:KnownProxies").Get<string[]>() ?? [])
    {
        if (IPAddress.TryParse(configuredProxy, out var address)) options.KnownProxies.Add(address);
    }
});

var app = builder.Build();
app.MapFluentAOpenApi();
app.UseFluentAExceptionHandling();
app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseCors("FluentAPolicy");
app.UseMiddleware<RequestLogMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapFluentAHealthChecks();
app.MapControllers();
app.MapHub<SyncHub>("/hubs/sync");
RecurringJobRegistration.Register(app.Services.GetRequiredService<IRecurringJobManager>());
app.Run();

public partial class Program;
