using System.Reflection;
using FluentA.API.Controllers;
using Microsoft.AspNetCore.Mvc.Routing;

namespace FluentA.API.UnitTests;

public sealed class ReviewControllerContractTests
{
    [Fact]
    public void ReviewController_ExposesOnlyTypedReviewEndpoints()
    {
        var actions = typeof(ReviewController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Select(method => method.Name)
            .OrderBy(name => name, StringComparer.Ordinal)
            .ToArray();

        Assert.Equal(
            [
                nameof(ReviewController.CreateReviewSession),
                nameof(ReviewController.GetDashboard),
                nameof(ReviewController.GetReviewSession),
                nameof(ReviewController.SubmitAnswer),
            ],
            actions);

        var routes = typeof(ReviewController)
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .SelectMany(method => method.GetCustomAttributes<HttpMethodAttribute>())
            .Select(attr => attr.Template ?? string.Empty)
            .ToArray();

        Assert.DoesNotContain(routes, template => template.Contains("pronunciation", StringComparison.OrdinalIgnoreCase));
    }
}
