using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.Common.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(UserProfileDto user);
    string CreateEmailVerificationToken(UserProfileDto user);
    Guid? ReadEmailVerificationUserId(string token);
}
