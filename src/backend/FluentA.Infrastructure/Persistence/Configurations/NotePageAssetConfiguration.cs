using FluentA.Domain.BoundedContexts.Assets.Entities;
using FluentA.Domain.BoundedContexts.Note.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class NotePageAssetConfiguration : IEntityTypeConfiguration<NotePageAsset>
{
    public void Configure(EntityTypeBuilder<NotePageAsset> builder)
    {
        builder.ToTable("note_page_assets");
        builder.HasKey(link => link.Id);

        builder.Property(link => link.Id).HasColumnName("id");
        builder.Property(link => link.NotePageId).HasColumnName("note_page_id").IsRequired();
        builder.Property(link => link.AssetId).HasColumnName("asset_id").IsRequired();
        builder.Property(link => link.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(link => link.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(link => link.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(link => link.AssetId).IsUnique();
        builder.HasIndex(link => new { link.NotePageId, link.DeletedAt });

        builder.HasOne<NotePage>()
            .WithMany()
            .HasForeignKey(link => link.NotePageId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Asset>()
            .WithMany()
            .HasForeignKey(link => link.AssetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
