using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabWordConfiguration : IEntityTypeConfiguration<VocabWord>
{
    public void Configure(EntityTypeBuilder<VocabWord> builder)
    {
        builder.ToTable("vocab_words");
        builder.HasKey(word => word.Id);

        builder.Property(word => word.Id).HasColumnName("id");
        builder.Property(word => word.PageId).HasColumnName("page_id").IsRequired();
        builder.Property(word => word.Word).HasColumnName("word").HasMaxLength(240).IsRequired();
        builder.Property(word => word.MeaningVn).HasColumnName("meaning_vn").HasMaxLength(1000).IsRequired();
        builder.Property(word => word.IpaPronunciation).HasColumnName("ipa_pronunciation").HasMaxLength(2000).IsRequired();
        builder.Property(word => word.Class).HasColumnName("class").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(word => word.Definition).HasColumnName("definition").HasMaxLength(4000);
        builder.Property(word => word.Example).HasColumnName("example").HasMaxLength(2000).IsRequired();
        builder.Property(word => word.Note).HasColumnName("note").HasMaxLength(4000);
        builder.Property(word => word.Synonyms).HasColumnName("synonyms").HasMaxLength(2000);
        builder.Property(word => word.Antonyms).HasColumnName("antonyms").HasMaxLength(2000);
        builder.Property(word => word.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(word => word.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(word => word.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<VocabPage>()
            .WithMany()
            .HasForeignKey(word => word.PageId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(word => new { word.PageId, word.CreatedAt });
    }
}
