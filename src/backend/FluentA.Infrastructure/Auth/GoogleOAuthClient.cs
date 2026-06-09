using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Auth;

public sealed class GoogleOAuthClient : IGoogleOAuthClient
{
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";
    private const string UserInfoEndpoint = "https://openidconnect.googleapis.com/v1/userinfo";
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;

    public GoogleOAuthClient(HttpClient httpClient, IConfiguration configuration)
    {
        _httpClient = httpClient;
        _configuration = configuration;
    }

    public async Task<OperationResult<GoogleUserInfo>> ExchangeCodeAsync(GoogleLoginRequest request, CancellationToken cancellationToken = default)
    {
        var clientId = _configuration["Authentication:Google:ClientId"];
        var clientSecret = _configuration["Authentication:Google:ClientSecret"];
        var configuredRedirectUri = _configuration["Authentication:Google:RedirectUri"];
        var redirectUri = string.IsNullOrWhiteSpace(request.RedirectUri) ? configuredRedirectUri : request.RedirectUri;

        if (string.IsNullOrWhiteSpace(clientId) || string.IsNullOrWhiteSpace(clientSecret) || string.IsNullOrWhiteSpace(redirectUri))
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleNotConfigured());
        }

        using var tokenResponse = await _httpClient.PostAsync(TokenEndpoint, new FormUrlEncodedContent(new Dictionary<string, string>
        {
            ["code"] = request.Code,
            ["client_id"] = clientId,
            ["client_secret"] = clientSecret,
            ["redirect_uri"] = redirectUri,
            ["grant_type"] = "authorization_code"
        }), cancellationToken);

        if (!tokenResponse.IsSuccessStatusCode)
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }

        var token = await JsonSerializer.DeserializeAsync<GoogleTokenResponse>(
            await tokenResponse.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);

        if (string.IsNullOrWhiteSpace(token?.AccessToken))
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }

        using var userInfoRequest = new HttpRequestMessage(HttpMethod.Get, UserInfoEndpoint);
        userInfoRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);

        using var userInfoResponse = await _httpClient.SendAsync(userInfoRequest, cancellationToken);
        if (!userInfoResponse.IsSuccessStatusCode)
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }

        var profile = await JsonSerializer.DeserializeAsync<GoogleUserInfoResponse>(
            await userInfoResponse.Content.ReadAsStreamAsync(cancellationToken),
            cancellationToken: cancellationToken);

        if (string.IsNullOrWhiteSpace(profile?.Subject) || string.IsNullOrWhiteSpace(profile.Email))
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }

        return OperationResult<GoogleUserInfo>.Success(new GoogleUserInfo(
            profile.Subject,
            profile.Email,
            string.IsNullOrWhiteSpace(profile.Name) ? profile.Email : profile.Name,
            profile.EmailVerified));
    }

    private sealed record GoogleTokenResponse(
        [property: JsonPropertyName("access_token")] string? AccessToken);

    private sealed record GoogleUserInfoResponse(
        [property: JsonPropertyName("sub")] string? Subject,
        [property: JsonPropertyName("email")] string? Email,
        [property: JsonPropertyName("name")] string? Name,
        [property: JsonPropertyName("email_verified")] bool EmailVerified);
}
