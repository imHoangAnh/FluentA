namespace FluentA.API.Extensions;

public static class OpenApiExtensions
{
    public static IServiceCollection AddFluentAOpenApi(this IServiceCollection services)
    {
        services.AddOpenApi();
        return services;
    }

    public static WebApplication MapFluentAOpenApi(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
        {
            app.MapOpenApi();
        }

        return app;
    }
}
