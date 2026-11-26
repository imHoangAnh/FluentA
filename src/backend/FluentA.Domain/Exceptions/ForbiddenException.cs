using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class ForbiddenException : DomainException
{
    public ForbiddenException() : base("Forbidden", "Access denied.") { }

    public ForbiddenException(string message) : base("Forbidden", message) { }
}
