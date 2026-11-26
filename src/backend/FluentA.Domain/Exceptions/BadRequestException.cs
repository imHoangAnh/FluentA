using FluentA.Domain.Exceptions.Abstractions;

namespace FluentA.Domain.Exceptions;

public class BadRequestException(string message) : DomainException("Bad Request", message);
