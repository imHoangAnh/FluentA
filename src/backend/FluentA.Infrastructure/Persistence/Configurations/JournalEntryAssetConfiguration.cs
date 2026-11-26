using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Journal.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class JournalEntryAssetConfiguration : IEntityTypeConfiguration<JournalEntryAsset>
{
    public void Configure(EntityTypeBuilder<JournalEntryAsset> builder)
    {
        builder.ToTable("journal_entry_assets");
        builder.HasKey(link => link.Id);

        builder.Property(link => link.Id).HasColumnName("id");
        builder.Property(link => link.JournalEntryId).HasColumnName("journal_entry_id").IsRequired();
        builder.Property(link => link.AssetId).HasColumnName("asset_id").IsRequired();
        builder.Property(link => link.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(link => link.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(link => link.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(link => link.AssetId).IsUnique();
        builder.HasIndex(link => new { link.JournalEntryId, link.DeletedAt });

        builder.HasOne<JournalEntry>()
            .WithMany()
            .HasForeignKey(link => link.JournalEntryId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Asset>()
            .WithMany()
            .HasForeignKey(link => link.AssetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
