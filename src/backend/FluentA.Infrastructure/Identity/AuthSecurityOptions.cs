using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Identity;

public sealed record AuthSecurityOptions(
    string JwtKey,
    string JwtIssuer,
    string JwtAudience,
    string OtpHashKey,
    string GoogleClientId,
    string ResendApiKey,
    string ResendFrom,
    string FrontendBaseUrl)
{
    public static AuthSecurityOptions FromConfiguration(IConfiguration configuration) => new(
        configuration["Jwt:Key"]?.Trim() ?? string.Empty,
        configuration["Jwt:Issuer"]?.Trim() ?? "FluentA",
        configuration["Jwt:Audience"]?.Trim() ?? "FluentA.Web",
        configuration["Authentication:OtpHashKey"]?.Trim() ?? string.Empty,
        configuration["Authentication:Google:ClientId"]?.Trim() ?? string.Empty,
        configuration["Resend:ApiKey"]?.Trim() ?? string.Empty,
        configuration["Resend:From"]?.Trim() ?? string.Empty,
        (configuration["Frontend:BaseUrl"]?.Trim() ?? "https://localhost:5173").TrimEnd('/'));

    public void Validate()
    {
        if (System.Text.Encoding.UTF8.GetByteCount(JwtKey) < 32)
        {
            throw new InvalidOperationException("Jwt:Key must contain at least 32 UTF-8 bytes.");
        }

        if (System.Text.Encoding.UTF8.GetByteCount(OtpHashKey) < 32)
        {
            throw new InvalidOperationException("Authentication:OtpHashKey must contain at least 32 UTF-8 bytes.");
        }

        if (string.IsNullOrWhiteSpace(GoogleClientId))
        {
            throw new InvalidOperationException("Authentication:Google:ClientId is required.");
        }

        if (string.IsNullOrWhiteSpace(ResendApiKey) || string.IsNullOrWhiteSpace(ResendFrom))
        {
            throw new InvalidOperationException("Resend:ApiKey and Resend:From are required.");
        }
    }
}
