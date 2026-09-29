using FluentA.Domain.BoundedContexts.Practice.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PracticeAttemptConfiguration : IEntityTypeConfiguration<PracticeAttempt>
{
    public void Configure(EntityTypeBuilder<PracticeAttempt> builder)
    {
        builder.ToTable("practice_attempts");
        builder.HasKey(attempt => attempt.Id);

        builder.Property(attempt => attempt.Id).HasColumnName("id");
        builder.Property(attempt => attempt.PracticeSessionId).HasColumnName("practice_session_id").IsRequired();
        builder.Property(attempt => attempt.PracticeSessionItemId).HasColumnName("practice_session_item_id").IsRequired();
        builder.Property(attempt => attempt.Step).HasColumnName("step").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(attempt => attempt.Kind).HasColumnName("kind").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(attempt => attempt.SubmittedAnswer).HasColumnName("submitted_answer").HasMaxLength(2000);
        builder.Property(attempt => attempt.AnswerSlotId).HasColumnName("answer_slot_id");
        builder.Property(attempt => attempt.Correctness).HasColumnName("correctness").IsRequired();
        builder.Property(attempt => attempt.DurationMs).HasColumnName("duration_ms").IsRequired();
        builder.Property(attempt => attempt.AttemptNumber).HasColumnName("attempt_number");
        builder.Property(attempt => attempt.AccuracyScore).HasColumnName("accuracy_score");
        builder.Property(attempt => attempt.CompletenessScore).HasColumnName("completeness_score");
        builder.Property(attempt => attempt.AssessmentJson).HasColumnName("assessment_json").HasColumnType("jsonb");
        builder.Property(attempt => attempt.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(attempt => attempt.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(attempt => attempt.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<PracticeSession>()
            .WithMany()
            .HasForeignKey(attempt => attempt.PracticeSessionId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<PracticeSessionItem>()
            .WithMany()
            .HasForeignKey(attempt => attempt.PracticeSessionItemId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(attempt => new { attempt.PracticeSessionId, attempt.CreatedAt });
        builder.HasIndex(attempt => new { attempt.PracticeSessionItemId, attempt.Step });
    }
}
