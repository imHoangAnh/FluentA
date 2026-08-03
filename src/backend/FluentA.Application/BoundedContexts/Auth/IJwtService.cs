using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IJwtService
{
    string GenerateToken(UserProfileDto user);
}
