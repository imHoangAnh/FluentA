using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class WordReviewHistoryConfiguration : IEntityTypeConfiguration<WordReviewHistory>
{
    public void Configure(EntityTypeBuilder<WordReviewHistory> builder)
    {
        builder.ToTable("word_review_histories");

        builder.HasKey(history => history.Id);

        builder.Property(history => history.Id).HasColumnName("id");
        builder.Property(history => history.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(history => history.WordId).HasColumnName("word_id").IsRequired();
        builder.Property(history => history.SessionId).HasColumnName("session_id").IsRequired();
        builder.Property(history => history.TimeSpentSeconds).HasColumnName("time_spent_seconds").IsRequired();
        builder.Property(history => history.ReviewedAt).HasColumnName("reviewed_at").IsRequired();
        builder.Property(history => history.Result).HasColumnName("result").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(history => history.LevelBefore).HasColumnName("level_before").IsRequired();
        builder.Property(history => history.LevelAfter).HasColumnName("level_after").IsRequired();
        builder.Property(history => history.NextReviewDate).HasColumnName("next_review_date").IsRequired();
        builder.Property(history => history.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(history => history.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(history => history.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<VocabWord>()
            .WithMany()
            .HasForeignKey(history => history.WordId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(history => new { history.UserId, history.SessionId })
            .HasFilter("deleted_at IS NULL");
        builder.HasIndex(history => new { history.UserId, history.ReviewedAt })
            .HasDatabaseName("IX_word_review_histories_user_id_reviewed_at_active")
            .HasFilter("deleted_at IS NULL");
        builder.HasIndex(history => new { history.WordId, history.ReviewedAt });
    }
}
