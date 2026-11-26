using FluentA.Domain.BoundedContexts.Practice.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PracticeSessionItemConfiguration : IEntityTypeConfiguration<PracticeSessionItem>
{
    public void Configure(EntityTypeBuilder<PracticeSessionItem> builder)
    {
        builder.ToTable("practice_session_items");
        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.PracticeSessionId).HasColumnName("practice_session_id").IsRequired();
        builder.Property(item => item.WordId).HasColumnName("word_id").IsRequired();
        builder.Property(item => item.Position).HasColumnName("position").IsRequired();
        builder.Property(item => item.Word).HasColumnName("word").HasMaxLength(240).IsRequired();
        builder.Property(item => item.Meaning).HasColumnName("meaning").HasMaxLength(1000).IsRequired();
        builder.Property(item => item.IpaPronunciation).HasColumnName("ipa_pronunciation").HasMaxLength(2000).IsRequired();
        builder.Property(item => item.Type).HasColumnName("type").HasMaxLength(32).IsRequired();
        builder.Property(item => item.Context).HasColumnName("context").HasMaxLength(4000);
        builder.Property(item => item.Example).HasColumnName("example").HasMaxLength(2000).IsRequired();
        builder.Property(item => item.Synonyms).HasColumnName("synonyms").HasMaxLength(2000);
        builder.Property(item => item.Antonyms).HasColumnName("antonyms").HasMaxLength(2000);
        builder.Property(item => item.CurrentStep).HasColumnName("current_step").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(item => item.AlreadyInReview).HasColumnName("already_in_review").IsRequired();
        builder.Property(item => item.SelectedLevel).HasColumnName("selected_level");
        builder.Property(item => item.HasMistake).HasColumnName("has_mistake").IsRequired();
        builder.Property(item => item.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(item => item.CompletedAt).HasColumnName("completed_at");

        builder.Property(item => item.Choice1SlotId).HasColumnName("choice_1_slot_id").IsRequired();
        builder.Property(item => item.Choice2SlotId).HasColumnName("choice_2_slot_id").IsRequired();
        builder.Property(item => item.Choice3SlotId).HasColumnName("choice_3_slot_id").IsRequired();
        builder.Property(item => item.Choice4SlotId).HasColumnName("choice_4_slot_id").IsRequired();
        builder.Property(item => item.Choice1Meaning).HasColumnName("choice_1_meaning").HasMaxLength(1000);
        builder.Property(item => item.Choice2Meaning).HasColumnName("choice_2_meaning").HasMaxLength(1000);
        builder.Property(item => item.Choice3Meaning).HasColumnName("choice_3_meaning").HasMaxLength(1000);
        builder.Property(item => item.Choice4Meaning).HasColumnName("choice_4_meaning").HasMaxLength(1000);
        builder.Property(item => item.CorrectAnswerSlotId).HasColumnName("correct_answer_slot_id").IsRequired();
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<PracticeSession>()
            .WithMany()
            .HasForeignKey(item => item.PracticeSessionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(item => new { item.PracticeSessionId, item.Position }).IsUnique();
        builder.HasIndex(item => item.WordId);
    }
}
