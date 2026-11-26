using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class ConflictException(string message) : DomainException("Conflict", message);
