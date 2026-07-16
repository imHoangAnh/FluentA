using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Assets.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class AssetConfiguration : IEntityTypeConfiguration<Asset>
{
    public void Configure(EntityTypeBuilder<Asset> builder)
    {
        builder.ToTable("assets");

        builder.HasKey(asset => asset.Id);

        builder.Property(asset => asset.Id).HasColumnName("id");
        builder.Property(asset => asset.UploadedByUserId).HasColumnName("uploaded_by_user_id").IsRequired();
        builder.Property(asset => asset.Type).HasColumnName("asset_type").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(asset => asset.Status).HasColumnName("status").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(asset => asset.ObjectKey).HasColumnName("object_key").HasMaxLength(1024).IsRequired();
        builder.Property(asset => asset.ContentType).HasColumnName("content_type").HasMaxLength(255).IsRequired();
        builder.Property(asset => asset.SizeBytes).HasColumnName("size_bytes").IsRequired();
        builder.Property(asset => asset.ExpiresAt).HasColumnName("expires_at");
        builder.Property(asset => asset.Bucket).HasColumnName("bucket").HasMaxLength(255);
        builder.Property(asset => asset.OriginalName).HasColumnName("original_name").HasMaxLength(255);
        builder.Property(asset => asset.ArchivedAt).HasColumnName("archived_at");
        builder.Property(asset => asset.PurgeAfterAt).HasColumnName("purge_after_at");
        builder.Property(asset => asset.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(asset => asset.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(asset => asset.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(asset => asset.ObjectKey).IsUnique();
        builder.HasIndex(asset => new { asset.UploadedByUserId, asset.Type, asset.DeletedAt });
        builder.HasIndex(asset => new { asset.UploadedByUserId, asset.Status, asset.DeletedAt });
        builder.HasIndex(asset => new { asset.Status, asset.PurgeAfterAt });

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(asset => asset.UploadedByUserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
