using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;
using Google.Apis.Auth;
using Microsoft.Extensions.Logging;

namespace FluentA.Infrastructure.Auth;

public sealed class GoogleIdTokenVerifier : IGoogleIdTokenVerifier
{
    private readonly string _clientId;
    private readonly ILogger<GoogleIdTokenVerifier> _logger;

    public GoogleIdTokenVerifier(AuthSecurityOptions options, ILogger<GoogleIdTokenVerifier> logger)
    {
        _clientId = options.GoogleClientId;
        _logger = logger;
    }

    public async Task<OperationResult<GoogleUserInfo>> VerifyAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken) || string.IsNullOrWhiteSpace(_clientId))
        {
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }

        try
        {
            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [_clientId]
            });

            if (payload.EmailVerified != true || string.IsNullOrWhiteSpace(payload.Email) || string.IsNullOrWhiteSpace(payload.Subject))
            {
                return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
            }

            return OperationResult<GoogleUserInfo>.Success(new GoogleUserInfo(
                payload.Subject,
                payload.Email,
                string.IsNullOrWhiteSpace(payload.Name) ? payload.Email : payload.Name,
                true));
        }
        catch (InvalidJwtException exception)
        {
            _logger.LogWarning(
                "Google ID-token validation rejected a credential. Failure type: {FailureType}.",
                exception.GetType().Name);
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }
        catch (Exception exception) when (exception is not OperationCanceledException || !cancellationToken.IsCancellationRequested)
        {
            _logger.LogError(
                "Google ID-token validation failed at the provider boundary. Failure type: {FailureType}.",
                exception.GetType().Name);
            return OperationResult<GoogleUserInfo>.Failure(AuthError.GoogleOAuthFailed());
        }
    }
}
