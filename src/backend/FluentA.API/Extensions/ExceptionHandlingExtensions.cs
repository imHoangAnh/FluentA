using FluentA.API.Contracts;

namespace FluentA.API.Extensions;

public static class ExceptionHandlingExtensions
{
    public static WebApplication UseFluentAExceptionHandling(this WebApplication app)
    {
        app.UseExceptionHandler(errorApp => errorApp.Run(async context =>
        {
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await context.Response.WriteAsJsonAsync(ApiEnvelope<object>.Fail(new ApiErrorEnvelope(
                "INTERNAL_ERROR", "An unexpected error occurred.")));
        }));

        return app;
    }
}
