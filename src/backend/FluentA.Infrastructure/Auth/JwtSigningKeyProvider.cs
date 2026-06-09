using System.Security.Cryptography;
using Microsoft.IdentityModel.Tokens;

namespace FluentA.Infrastructure.Auth;

public sealed class JwtSigningKeyProvider : IDisposable
{
    private readonly RSA _rsa = RSA.Create(2048);

    public RsaSecurityKey Key { get; }

    public JwtSigningKeyProvider()
    {
        Key = new RsaSecurityKey(_rsa)
        {
            KeyId = Guid.NewGuid().ToString("N")
        };
    }

    public void Dispose() => _rsa.Dispose();
}
