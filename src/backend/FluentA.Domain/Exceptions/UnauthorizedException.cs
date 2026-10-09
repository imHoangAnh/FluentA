using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class UnauthorizedException : DomainException
{
    public UnauthorizedException()
        : base("Unauthorized", "Authentication is required to access this resource.") { }

    public UnauthorizedException(string message) : base("Unauthorized", message) { }
}
