using FluentA.API.Contracts;
using FluentA.API.Hubs;
using FluentA.Application.BoundedContexts.Flashcards;
using FluentA.API.Middleware;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Auth;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddSignalR();
using var signingKeyProvider = new JwtSigningKeyProvider();
builder.Services.AddSingleton(signingKeyProvider);
builder.Services.AddFluentAInfrastructure(builder.Configuration);
builder.Services.AddScoped<IFlashcardSyncNotifier, SignalRFlashcardSyncNotifier>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("FluentAPolicy", policy =>
    {
        policy
            .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials();
    });
});

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "FluentA.Local",
            ValidateAudience = true,
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "FluentA.Client",
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = signingKeyProvider.Key,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromMinutes(1)
        };
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                if (!string.IsNullOrEmpty(accessToken)
                    && context.HttpContext.Request.Path.StartsWithSegments("/hubs/sync"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                    "UNAUTHORIZED",
                    "Missing or invalid authentication credentials.")));
            }
        };
    });
builder.Services.AddAuthorization();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
            "INTERNAL_ERROR",
            "An unexpected error occurred.")));
    });
});

app.UseCors("FluentAPolicy");
app.UseMiddleware<RequestLogMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHub<SyncHub>("/hubs/sync");

app.Run();

public partial class Program;
