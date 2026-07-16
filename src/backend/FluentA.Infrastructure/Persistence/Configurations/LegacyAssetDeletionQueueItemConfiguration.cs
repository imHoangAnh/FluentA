using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class LegacyAssetDeletionQueueItemConfiguration : IEntityTypeConfiguration<LegacyAssetDeletionQueueItem>
{
    public void Configure(EntityTypeBuilder<LegacyAssetDeletionQueueItem> builder)
    {
        builder.ToTable("legacy_asset_deletion_queue");
        builder.HasKey(item => item.ObjectKey);
        builder.Property(item => item.ObjectKey).HasColumnName("object_key").HasMaxLength(1024);
        builder.Property(item => item.Bucket).HasColumnName("bucket").HasMaxLength(255).IsRequired();
        builder.Property(item => item.Status).HasColumnName("status").HasMaxLength(32).IsRequired();
        builder.Property(item => item.AttemptCount).HasColumnName("attempt_count").IsRequired();
        builder.Property(item => item.ClaimedAt).HasColumnName("claimed_at");
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");
        builder.Property(item => item.LastError).HasColumnName("last_error").HasMaxLength(1024);
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.HasIndex(item => new { item.Status, item.UpdatedAt });
    }
}
