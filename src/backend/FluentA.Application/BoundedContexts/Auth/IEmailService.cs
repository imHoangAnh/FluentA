using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IEmailService
{
    Task<bool> SendEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
