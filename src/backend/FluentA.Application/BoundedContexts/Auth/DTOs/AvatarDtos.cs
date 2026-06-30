namespace FluentA.Application.BoundedContexts.Auth.DTOs;

public sealed record AvatarUpload(string FileName, string ContentType, byte[] Content);

public sealed record AvatarUploadResult(string Url, string PublicId);
