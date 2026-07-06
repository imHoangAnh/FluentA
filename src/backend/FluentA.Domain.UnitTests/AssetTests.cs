using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Assets.Enums;
using FluentA.Domain.BoundedContexts.Auth.Entities;

namespace FluentA.Domain.UnitTests;

public sealed class AssetTests
{
    [Fact]
    public void PendingAsset_CanFinalizeAndDelete()
    {
        var expiresAt = new DateTime(2026, 7, 3, 13, 0, 0, DateTimeKind.Utc);
        var deletedAt = new DateTime(2026, 7, 3, 14, 0, 0, DateTimeKind.Utc);
        var asset = Asset.CreatePending(
            Guid.NewGuid(),
            Guid.NewGuid(),
            AssetType.Avatar,
            "users/demo/avatar.png",
            "http://127.0.0.1:9000/fluenta-assets-dev/users/demo/avatar.png",
            "image/png",
            1024,
            expiresAt);

        asset.FinalizeUpload(
            "http://127.0.0.1:9000/fluenta-assets-dev/users/demo/avatar.png",
            "image/png",
            2048);
        asset.MarkDeleted(deletedAt);

        Assert.Equal(AssetStatus.Deleted, asset.Status);
        Assert.Equal(2048, asset.SizeBytes);
        Assert.Null(asset.ExpiresAt);
        Assert.Equal(deletedAt, asset.DeletedAt);
    }

    [Fact]
    public void PendingAsset_RequiresExpiry()
    {
        Assert.Throws<ArgumentException>(() =>
            Asset.CreatePending(
                Guid.NewGuid(),
                Guid.NewGuid(),
                AssetType.Avatar,
                "users/demo/avatar.png",
                "http://127.0.0.1:9000/fluenta-assets-dev/users/demo/avatar.png",
                "image/png",
                0,
                default));
    }

    [Fact]
    public void User_CurrentAvatarAssetLinkCanBeSetAndCleared()
    {
        var user = User.CreateWithPassword("learner@example.com", "Learner", "hash");
        var assetId = Guid.NewGuid();

        user.SetCurrentAvatarAsset(assetId);
        Assert.Equal(assetId, user.CurrentAvatarAssetId);

        user.SetCurrentAvatarAsset(Guid.Empty);
        Assert.Null(user.CurrentAvatarAssetId);
    }
}
