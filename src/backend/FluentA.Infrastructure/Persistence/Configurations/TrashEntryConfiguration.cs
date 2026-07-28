using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Trash.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class TrashEntryConfiguration : IEntityTypeConfiguration<TrashEntry>
{
    public void Configure(EntityTypeBuilder<TrashEntry> builder)
    {
        builder.ToTable("trash_entries");
        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.Id).HasColumnName("id");
        builder.Property(entry => entry.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(entry => entry.EntityKind).HasColumnName("entity_kind").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(entry => entry.EntityId).HasColumnName("entity_id").IsRequired();
        builder.Property(entry => entry.DisplayName).HasColumnName("display_name").HasMaxLength(240).IsRequired();
        builder.Property(entry => entry.OriginalLocation).HasColumnName("original_location").HasMaxLength(500).IsRequired();
        builder.Property(entry => entry.TrashedAt).HasColumnName("trashed_at").IsRequired();
        builder.Property(entry => entry.PurgeAfterAt).HasColumnName("purge_after_at").IsRequired();
        builder.Property(entry => entry.State).HasColumnName("state").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(entry => entry.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(entry => entry.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(entry => entry.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(entry => new { entry.EntityKind, entry.EntityId }).IsUnique();
        builder.HasIndex(entry => new { entry.UserId, entry.State, entry.TrashedAt });
        builder.HasIndex(entry => new { entry.State, entry.PurgeAfterAt });
        builder.HasOne<User>().WithMany().HasForeignKey(entry => entry.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
