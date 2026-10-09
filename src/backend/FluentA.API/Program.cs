using System.Net;
using FluentA.API.Configuration;
using FluentA.API.Extensions;
using FluentA.API.Middleware;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc;
using FluentA.API.Contracts;

var builder = WebApplication.CreateBuilder(args);
RuntimeConfigurationValidator.Validate(builder.Configuration, builder.Environment);
var authOptions = AuthSecurityOptions.FromConfiguration(builder.Configuration);
authOptions.Validate();

builder.Services.AddControllers().ConfigureApiBehaviorOptions(options =>
{
    options.InvalidModelStateResponseFactory = context =>
    {
        var details = context.ModelState
            .Where(entry => entry.Value?.Errors.Count > 0)
            .ToDictionary(
                entry => entry.Key,
                entry => entry.Value!.Errors.Select(error =>
                    string.IsNullOrWhiteSpace(error.ErrorMessage) ? "The supplied value is invalid." : error.ErrorMessage).ToArray());
        return new BadRequestObjectResult(ApiResponseFactory.Fail(
            "VALIDATION_ERROR", "The request contains invalid values.", details,
            context.HttpContext.TraceIdentifier));
    };
});
builder.Services.AddFluentAOpenApi();
builder.Services.AddFluentAInfrastructure(builder.Configuration);
builder.Services.AddFluentAHealthChecks();
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
app.UseStatusCodePages(async statusContext =>
{
    var context = statusContext.HttpContext;
    if (!context.Request.Path.StartsWithSegments("/api") || context.Response.HasStarted) return;
    var (code, message) = context.Response.StatusCode switch
    {
        StatusCodes.Status401Unauthorized => ("AUTHENTICATION_REQUIRED", "Authentication is required."),
        StatusCodes.Status403Forbidden => ("FORBIDDEN", "Access is forbidden."),
        StatusCodes.Status404NotFound => ("NOT_FOUND", "The requested endpoint was not found."),
        StatusCodes.Status405MethodNotAllowed => ("METHOD_NOT_ALLOWED", "The request method is not allowed."),
        _ => ("HTTP_ERROR", "The request could not be completed.")
    };
    await context.Response.WriteAsJsonAsync(ApiResponseFactory.Fail(
        code, message, traceId: context.TraceIdentifier));
});
app.UseForwardedHeaders();
app.UseHttpsRedirection();
app.UseCors("FluentAPolicy");
app.UseMiddleware<RequestLogMiddleware>();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapFluentAHealthChecks();
app.MapControllers();
app.Run();

public partial class Program;
