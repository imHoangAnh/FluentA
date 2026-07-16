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
            "users/demo/avatar.png", "image/png",
            1024,
            expiresAt);

        asset.FinalizeUpload("image/png",
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
                "users/demo/avatar.png", "image/png",
                0,
                default));
    }

    [Fact]
    public void ReadyAsset_ArchivesClaimsRequeuesAndPurges()
    {
        var now = new DateTime(2026, 7, 17, 10, 0, 0, DateTimeKind.Utc);
        var asset = Asset.CreatePending(Guid.NewGuid(), Guid.NewGuid(), AssetType.Avatar, "avatars/users/demo/avatar.png", "image/png", 0, now.AddHours(1));
        asset.FinalizeUpload("image/png", 100);

        asset.Archive(now, TimeSpan.FromDays(30));
        Assert.Equal(AssetStatus.Archived, asset.Status);
        Assert.Equal(now.AddDays(30), asset.PurgeAfterAt);
        Assert.Throws<InvalidOperationException>(() => asset.ClaimPurge(now.AddDays(29)));

        asset.ClaimPurge(now.AddDays(30));
        asset.RequeuePurge(now.AddDays(30));
        asset.ClaimPurge(now.AddDays(30));
        asset.MarkDeleted(now.AddDays(30));

        Assert.Equal(AssetStatus.Deleted, asset.Status);
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
