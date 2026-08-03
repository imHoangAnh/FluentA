namespace FluentA.Application.BoundedContexts.Auth;

public interface ITokenHelper
{
    string GenerateOtp();
    string GenerateRawToken();
    string HashOtp(string normalizedEmail, string otp);
    string HashToken(string rawToken);
}
