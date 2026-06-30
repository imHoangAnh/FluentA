using FluentA.Application.BoundedContexts.Auth.DTOs;

namespace FluentA.Application.BoundedContexts.Auth;

public interface IAvatarStorage
{
    Task<AvatarUploadResult> UploadAsync(Guid userId, AvatarUpload upload, CancellationToken cancellationToken = default);
    Task DeleteAsync(string publicId, CancellationToken cancellationToken = default);
}
