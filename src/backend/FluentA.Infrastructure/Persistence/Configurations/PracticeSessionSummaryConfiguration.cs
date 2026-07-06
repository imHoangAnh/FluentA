using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PracticeSessionSummaryConfiguration : IEntityTypeConfiguration<PracticeSessionSummary>
{
    public void Configure(EntityTypeBuilder<PracticeSessionSummary> builder)
    {
        builder.ToTable("session_summaries", "practice");

        builder.HasKey(summary => summary.Id);

        builder.Property(summary => summary.Id).HasColumnName("id");
        builder.Property(summary => summary.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(summary => summary.DeckId).HasColumnName("deck_id").IsRequired();
        builder.Property(summary => summary.Mode).HasColumnName("mode").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(summary => summary.TotalCards).HasColumnName("total_cards").IsRequired();
        builder.Property(summary => summary.CorrectCards).HasColumnName("correct_cards").IsRequired();
        builder.Property(summary => summary.WrongCards).HasColumnName("wrong_cards").IsRequired();
        builder.Property(summary => summary.CompletedAt).HasColumnName("completed_at").IsRequired();
        builder.Property(summary => summary.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(summary => summary.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(summary => summary.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(summary => summary.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne<FlashcardDeck>()
            .WithMany()
            .HasForeignKey(summary => summary.DeckId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(summary => new { summary.UserId, summary.CompletedAt });
        builder.HasIndex(summary => new { summary.DeckId, summary.CompletedAt });
    }
}
