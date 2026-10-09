using FluentA.API.Middleware;

namespace FluentA.API.Extensions;

public static class ExceptionHandlingExtensions
{
    public static WebApplication UseFluentAExceptionHandling(this WebApplication app)
    {
        app.UseMiddleware<ExceptionHandlingMiddleware>();

        return app;
    }
}
