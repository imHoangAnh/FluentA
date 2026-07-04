namespace FluentA.API.Contracts;

public sealed class UpdateProfileBody
{
    public string? FullName { get; init; }
    public string? Bio { get; init; }
    public bool RemoveAvatar { get; init; }
    public Guid? AvatarAssetId { get; init; }
}
