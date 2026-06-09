using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.Common.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(UserProfileDto user);
}
