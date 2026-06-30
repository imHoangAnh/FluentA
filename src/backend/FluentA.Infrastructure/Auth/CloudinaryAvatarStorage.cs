using System.IO;
using CloudinaryDotNet;
using CloudinaryDotNet.Actions;
using FluentA.Application.BoundedContexts.Auth;
using FluentA.Application.BoundedContexts.Auth.DTOs;
using Microsoft.Extensions.Configuration;

namespace FluentA.Infrastructure.Auth;

public sealed class CloudinaryAvatarStorage : IAvatarStorage
{
    private readonly IConfiguration _configuration;

    public CloudinaryAvatarStorage(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<AvatarUploadResult> UploadAsync(Guid userId, AvatarUpload upload, CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        await using var stream = new MemoryStream(upload.Content, writable: false);
        var response = await client.UploadAsync(new ImageUploadParams
        {
            File = new FileDescription(upload.FileName, stream),
            Folder = _configuration["Cloudinary:AvatarFolder"] ?? "fluenta/avatars",
            PublicId = $"{userId:N}-{Guid.NewGuid():N}",
            UseFilename = false,
            UniqueFilename = false,
            Overwrite = false
        }, cancellationToken);

        if (response.Error is not null || string.IsNullOrWhiteSpace(response.PublicId))
        {
            throw new AvatarStorageOperationException("Cloudinary avatar upload failed.");
        }

        var url = response.SecureUrl?.AbsoluteUri ?? response.Url?.AbsoluteUri;
        if (string.IsNullOrWhiteSpace(url))
        {
            throw new AvatarStorageOperationException("Cloudinary avatar upload did not return a URL.");
        }

        return new AvatarUploadResult(url, response.PublicId);
    }

    public async Task DeleteAsync(string publicId, CancellationToken cancellationToken = default)
    {
        var client = CreateClient();
        var response = await client.DestroyAsync(new DeletionParams(publicId)
        {
            ResourceType = ResourceType.Image,
            Invalidate = true
        });

        if (response.Error is not null)
        {
            throw new AvatarStorageOperationException("Cloudinary avatar deletion failed.");
        }

        if (!string.Equals(response.Result, "ok", StringComparison.OrdinalIgnoreCase)
            && !string.Equals(response.Result, "not found", StringComparison.OrdinalIgnoreCase))
        {
            throw new AvatarStorageOperationException("Cloudinary avatar deletion returned an unexpected result.");
        }
    }

    private Cloudinary CreateClient()
    {
        var cloudName = _configuration["Cloudinary:CloudName"];
        var apiKey = _configuration["Cloudinary:ApiKey"];
        var apiSecret = _configuration["Cloudinary:ApiSecret"];

        if (string.IsNullOrWhiteSpace(cloudName)
            || string.IsNullOrWhiteSpace(apiKey)
            || string.IsNullOrWhiteSpace(apiSecret))
        {
            throw new AvatarStorageUnavailableException("Cloudinary credentials are not configured.");
        }

        return new Cloudinary(new Account(cloudName, apiKey, apiSecret))
        {
            Api = { Secure = true }
        };
    }
}
