using FluentA.Domain.BoundedContexts.Review.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ReviewAttemptConfiguration : IEntityTypeConfiguration<ReviewAttempt>
{
    public void Configure(EntityTypeBuilder<ReviewAttempt> builder)
    {
        builder.ToTable("review_attempts");

        builder.HasKey(attempt => attempt.Id);

        builder.Property(attempt => attempt.Id).HasColumnName("id");
        builder.Property(attempt => attempt.ReviewSessionItemId).HasColumnName("review_session_item_id").IsRequired();
        builder.Property(attempt => attempt.AttemptNumber).HasColumnName("attempt_number").IsRequired();
        builder.Property(attempt => attempt.Mode).HasColumnName("mode").HasMaxLength(32).IsRequired();
        builder.Property(attempt => attempt.AnswerText).HasColumnName("answer_text").HasMaxLength(4000);
        builder.Property(attempt => attempt.IsCorrect).HasColumnName("is_correct").IsRequired();
        builder.Property(attempt => attempt.AccuracyScore).HasColumnName("accuracy_score");
        builder.Property(attempt => attempt.CompletenessScore).HasColumnName("completeness_score");
        builder.Property(attempt => attempt.FeedbackMode).HasColumnName("feedback_mode").HasMaxLength(16);
        builder.Property(attempt => attempt.FeedbackJson).HasColumnName("feedback_json").HasColumnType("jsonb");
        builder.Property(attempt => attempt.TimeSpentSeconds).HasColumnName("time_spent_seconds").IsRequired();
        builder.Property(attempt => attempt.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(attempt => attempt.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(attempt => attempt.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<ReviewSessionItem>()
            .WithMany()
            .HasForeignKey(attempt => attempt.ReviewSessionItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(attempt => new { attempt.ReviewSessionItemId, attempt.AttemptNumber })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
