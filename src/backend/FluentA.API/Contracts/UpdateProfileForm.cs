using Microsoft.AspNetCore.Http;

namespace FluentA.API.Contracts;

public sealed class UpdateProfileForm
{
    public string? FullName { get; init; }
    public string? Bio { get; init; }
    public bool RemoveAvatar { get; init; }
    public IFormFile? Avatar { get; init; }
}
