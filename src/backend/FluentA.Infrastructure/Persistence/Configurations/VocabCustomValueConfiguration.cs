using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabCustomValueConfiguration : IEntityTypeConfiguration<VocabCustomValue>
{
    public void Configure(EntityTypeBuilder<VocabCustomValue> builder)
    {
        builder.ToTable("vocab_custom_values", table => table.HasCheckConstraint(
            "ck_vocab_custom_values_one_type",
            "(text_value IS NOT NULL AND number_value IS NULL) OR (text_value IS NULL AND number_value IS NOT NULL)"));
        builder.HasKey(value => value.Id);
        builder.Property(value => value.Id).HasColumnName("id");
        builder.Property(value => value.WordId).HasColumnName("word_id").IsRequired();
        builder.Property(value => value.ColumnId).HasColumnName("column_id").IsRequired();
        builder.Property(value => value.TextValue).HasColumnName("text_value").HasMaxLength(4000);
        builder.Property(value => value.NumberValue).HasColumnName("number_value").HasPrecision(18, 4);
        builder.Property(value => value.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(value => value.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(value => value.DeletedAt).HasColumnName("deleted_at");
        builder.HasOne<VocabWord>().WithMany().HasForeignKey(value => value.WordId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<VocabCustomColumn>().WithMany().HasForeignKey(value => value.ColumnId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(value => new { value.WordId, value.ColumnId }).IsUnique();
    }
}
