using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IJwtService
{
    AccessTokenIssue GenerateToken(Guid userId, DateTime issuedAtUtc);
}
