using FluentA.Application.BoundedContexts.Auth.DTOs;
using FluentA.Application.Common;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IGoogleIdTokenVerifier
{
    Task<OperationResult<GoogleUserInfo>> VerifyAsync(string idToken, CancellationToken cancellationToken = default);
}
