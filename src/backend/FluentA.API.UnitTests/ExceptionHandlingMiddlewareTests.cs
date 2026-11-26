using System.Text.Json;
using FluentA.API.Contracts;
using FluentA.API.Middleware;
using FluentA.Domain.Exceptions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;

namespace FluentA.API.UnitTests;

public sealed class ExceptionHandlingMiddlewareTests
{
    [Theory]
    [InlineData(typeof(ValidationException), 400, "Validation Error")]
    [InlineData(typeof(BadRequestException), 400, "Bad Request")]
    [InlineData(typeof(NotFoundException), 404, "Not Found")]
    [InlineData(typeof(ForbiddenException), 403, "Forbidden")]
    [InlineData(typeof(ConflictException), 409, "Conflict")]
    [InlineData(typeof(UnauthorizedException), 401, "Unauthorized")]
    [InlineData(typeof(InvalidOperationException), 500, "INTERNAL_ERROR")]
    public async Task Exception_maps_to_standard_response(Type exceptionType, int status, string code)
    {
        var exception = exceptionType == typeof(ValidationException)
            ? new ValidationException(new Dictionary<string, string[]> { ["email"] = ["Email is invalid."] })
            : exceptionType == typeof(NotFoundException)
                ? new NotFoundException("User", 42)
                : (Exception)Activator.CreateInstance(exceptionType, "Failure details.")!;
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        context.TraceIdentifier = "test-trace";
        var middleware = new ExceptionHandlingMiddleware(_ => throw exception,
            NullLogger<ExceptionHandlingMiddleware>.Instance);

        await middleware.InvokeAsync(context);

        Assert.Equal(status, context.Response.StatusCode);
        context.Response.Body.Position = 0;
        using var json = await JsonDocument.ParseAsync(context.Response.Body);
        var root = json.RootElement;
        Assert.False(root.GetProperty("success").GetBoolean());
        Assert.Equal("test-trace", root.GetProperty("traceId").GetString());
        Assert.Equal(code, root.GetProperty("errors")[0].GetProperty("code").GetString());
        Assert.Equal(JsonValueKind.Null, root.GetProperty("data").ValueKind);
        if (exception is ValidationException)
        {
            Assert.Equal("email", root.GetProperty("errors")[0].GetProperty("field").GetString());
        }
        if (status == 500)
        {
            Assert.Equal("An unexpected error occurred.", root.GetProperty("message").GetString());
        }
    }

    [Fact]
    public void Domain_exceptions_expose_the_code_and_message_from_the_base_class()
    {
        var notFound = new NotFoundException("User", 42);
        Assert.Equal("Not Found", notFound.Code);
        Assert.Equal("User with key '42' was not found.", notFound.Message);
        Assert.Equal("Not Found", new NotFoundException("User missing.").Code);
        Assert.Equal("Access denied.", new ForbiddenException().Message);
        Assert.Equal("Authentication is required to access this resource.", new UnauthorizedException().Message);
    }

    [Fact]
    public void Result_validation_details_become_field_errors()
    {
        var response = ApiResponseFactory.Fail("VALIDATION_ERROR", "Invalid request.",
            new Dictionary<string, string[]> { ["name"] = ["Name is required.", "Name is too long."] });

        Assert.Equal(2, response.Errors.Count);
        Assert.All(response.Errors, error => Assert.Equal("name", error.Field));
    }
}
