using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabPageConfiguration : IEntityTypeConfiguration<VocabPage>
{
    public void Configure(EntityTypeBuilder<VocabPage> builder)
    {
        builder.ToTable("vocab_pages");

        builder.HasKey(page => page.Id);

        builder.Property(page => page.Id).HasColumnName("id");
        builder.Property(page => page.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(page => page.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(page => page.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(page => page.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(page => page.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(page => page.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(page => new { page.BoardId, page.SortOrder });
    }
}
