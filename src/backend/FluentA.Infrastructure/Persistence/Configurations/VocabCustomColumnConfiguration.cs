using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabCustomColumnConfiguration : IEntityTypeConfiguration<VocabCustomColumn>
{
    public void Configure(EntityTypeBuilder<VocabCustomColumn> builder)
    {
        builder.ToTable("vocab_custom_columns");
        builder.HasKey(column => column.Id);
        builder.Property(column => column.Id).HasColumnName("id");
        builder.Property(column => column.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(column => column.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(column => column.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(column => column.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(column => column.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(column => column.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(column => column.DeletedAt).HasColumnName("deleted_at");
        builder.HasOne<VocabBoard>().WithMany().HasForeignKey(column => column.BoardId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(column => new { column.BoardId, column.Name }).IsUnique();
        builder.HasIndex(column => new { column.BoardId, column.SortOrder });
    }
}
