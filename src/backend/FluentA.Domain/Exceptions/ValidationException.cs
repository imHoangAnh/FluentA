using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class ValidationException : DomainException
{
    public ValidationException(IReadOnlyDictionary<string, string[]> errors)
        : base("Validation Error", "The request contains invalid values.")
    {
        Errors = errors;
    }

    public IReadOnlyDictionary<string, string[]> Errors { get; }
}
