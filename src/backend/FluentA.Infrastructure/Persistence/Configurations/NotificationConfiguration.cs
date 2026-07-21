using FluentA.Domain.BoundedContexts.Notification.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.ToTable("notifications");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).HasColumnName("id");
        builder.Property(x => x.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(x => x.Type).HasColumnName("type").HasMaxLength(40).IsRequired();
        builder.Property(x => x.Title).HasColumnName("title").HasMaxLength(180).IsRequired();
        builder.Property(x => x.Message).HasColumnName("message").HasMaxLength(500).IsRequired();
        builder.Property(x => x.DeduplicationKey).HasColumnName("deduplication_key").HasMaxLength(240).IsRequired();
        builder.Property(x => x.ActionPath).HasColumnName("action_path").HasMaxLength(500);
        builder.Property(x => x.ReadAt).HasColumnName("read_at");
        builder.Property(x => x.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(x => x.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(x => x.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(x => new { x.UserId, x.DeduplicationKey }).IsUnique();
        builder.HasIndex(x => new { x.UserId, x.ReadAt, x.CreatedAt });
    }
}
