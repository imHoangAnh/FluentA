namespace FluentA.API.Extensions;

public static class CorsExtensions
{
    public static IServiceCollection AddFluentACors(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var frontendOrigins = configuration.GetSection("Frontend:Origins").Get<string[]>()
            ?? ["https://localhost:5173", "https://127.0.0.1:5173"];

        services.AddCors(options => options.AddPolicy("FluentAPolicy", policy => policy
            .WithOrigins(frontendOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));
        return services;
    }
}
