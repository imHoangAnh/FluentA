using FluentA.Application.BoundedContexts.Auth;
using FluentA.Infrastructure;
using FluentA.Infrastructure.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FluentA.Application.UnitTests;

public sealed class AuthDependencyInjectionTests
{
    [Fact]
    public void EmailService_IsScopedBecauseResendUsesRequestScopedOptions()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Authentication:OtpHashKey"] = "test-otp-hmac-key-that-is-at-least-thirty-two-bytes",
                ["Authentication:Google:ClientId"] = "test-client-id.apps.googleusercontent.com",
                ["Jwt:Key"] = "test-jwt-key-that-is-at-least-thirty-two-bytes",
                ["Resend:ApiKey"] = "re_test_only",
                ["Resend:From"] = "FluentA Test <noreply@example.test>",
                ["AssetStorage:Enabled"] = "false"
            })
            .Build();
        var services = new ServiceCollection();

        services.AddFluentAInfrastructure(configuration);

        var descriptor = Assert.Single(services, service => service.ServiceType == typeof(IEmailService));
        Assert.Equal(ServiceLifetime.Scoped, descriptor.Lifetime);
        Assert.Equal(typeof(ResendEmailService), descriptor.ImplementationType);
    }
}
