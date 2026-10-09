using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class NotFoundException : DomainException
{
    public NotFoundException(string message) : base("Not Found", message) { }

    public NotFoundException(string resourceName, object key)
        : base("Not Found", $"{resourceName} with key '{key}' was not found.") { }
}
