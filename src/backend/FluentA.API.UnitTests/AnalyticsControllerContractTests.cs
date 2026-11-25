using System.Reflection;
using FluentA.API.Controllers;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Routing;

namespace FluentA.API.UnitTests;

public sealed class AnalyticsControllerContractTests
{
    [Fact]
    public void AnalyticsController_RequiresAuthorizationAndExposesGetEndpoint()
    {
        var controllerType = typeof(AnalyticsController);

        Assert.NotNull(controllerType.GetCustomAttribute<AuthorizeAttribute>());
        var route = controllerType.GetCustomAttribute<RouteAttribute>();
        Assert.NotNull(route);
        Assert.Equal("api/v1/analytics", route!.Template);

        var actions = controllerType
            .GetMethods(BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly)
            .Select(method => method.Name)
            .ToArray();

        Assert.Equal([nameof(AnalyticsController.GetLearningAnalytics)], actions);

        var method = controllerType.GetMethod(nameof(AnalyticsController.GetLearningAnalytics))!;
        var httpMethods = method.GetCustomAttributes<HttpMethodAttribute>().ToArray();
        Assert.Single(httpMethods);
        Assert.IsType<HttpGetAttribute>(httpMethods[0]);
    }
}
