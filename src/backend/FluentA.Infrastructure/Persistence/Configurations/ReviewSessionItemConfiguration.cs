using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ReviewSessionItemConfiguration : IEntityTypeConfiguration<ReviewSessionItem>
{
    public void Configure(EntityTypeBuilder<ReviewSessionItem> builder)
    {
        builder.ToTable("review_session_items");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.ReviewSessionId).HasColumnName("review_session_id").IsRequired();
        builder.Property(item => item.VocabWordId).HasColumnName("vocab_word_id").IsRequired();
        builder.Property(item => item.Position).HasColumnName("position").IsRequired();
        builder.Property(item => item.Mode).HasColumnName("mode").HasMaxLength(32).IsRequired();
        builder.Property(item => item.LanguageSnapshot).HasColumnName("language_snapshot").HasMaxLength(8).IsRequired();
        builder.Property(item => item.WordSnapshot).HasColumnName("word_snapshot").HasMaxLength(240).IsRequired();
        builder.Property(item => item.MeaningSnapshot).HasColumnName("meaning_snapshot").HasMaxLength(1000).IsRequired();
        builder.Property(item => item.IpaPronunciationSnapshot).HasColumnName("ipa_pronunciation_snapshot").HasMaxLength(2000).IsRequired();
        builder.Property(item => item.TypeSnapshot).HasColumnName("type_snapshot").HasMaxLength(20).IsRequired();
        builder.Property(item => item.ContextSnapshot).HasColumnName("context_snapshot").HasMaxLength(4000);
        builder.Property(item => item.ExampleSnapshot).HasColumnName("example_snapshot").HasMaxLength(2000).IsRequired();
        builder.Property(item => item.SynonymsSnapshot).HasColumnName("synonyms_snapshot").HasMaxLength(2000);
        builder.Property(item => item.AntonymsSnapshot).HasColumnName("antonyms_snapshot").HasMaxLength(2000);
        builder.Property(item => item.IsReviewed).HasColumnName("is_reviewed").IsRequired();
        builder.Property(item => item.Result).HasColumnName("result").HasConversion<string>().HasMaxLength(20);
        builder.Property(item => item.LevelBefore).HasColumnName("level_before");
        builder.Property(item => item.LevelAfter).HasColumnName("level_after");
        builder.Property(item => item.NextReviewDateBefore).HasColumnName("next_review_date_before").HasColumnType("date");
        builder.Property(item => item.NextReviewDateAfter).HasColumnName("next_review_date_after").HasColumnType("date");
        builder.Property(item => item.CompletedAt).HasColumnName("completed_at");
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<ReviewSession>()
            .WithMany()
            .HasForeignKey(item => item.ReviewSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<VocabWord>()
            .WithMany()
            .HasForeignKey(item => item.VocabWordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(item => new { item.ReviewSessionId, item.VocabWordId })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
        builder.HasIndex(item => new { item.ReviewSessionId, item.Position })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
