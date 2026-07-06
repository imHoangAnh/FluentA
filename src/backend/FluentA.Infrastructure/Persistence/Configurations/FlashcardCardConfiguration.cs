using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class FlashcardCardConfiguration : IEntityTypeConfiguration<FlashcardCard>
{
    public void Configure(EntityTypeBuilder<FlashcardCard> builder)
    {
        builder.ToTable("cards", "flashcards");

        builder.HasKey(card => card.Id);

        builder.Property(card => card.Id).HasColumnName("id");
        builder.Property(card => card.DeckId).HasColumnName("deck_id").IsRequired();
        builder.Property(card => card.WordId).HasColumnName("word_id").IsRequired();
        builder.Property(card => card.Word).HasColumnName("word").HasMaxLength(240).IsRequired();
        builder.Property(card => card.WordClass).HasColumnName("word_class").HasMaxLength(20).IsRequired();
        builder.Property(card => card.MeaningVn).HasColumnName("meaning_vn").HasMaxLength(1000).IsRequired();
        builder.Property(card => card.MeaningEn).HasColumnName("meaning_en").HasMaxLength(2000).IsRequired();
        builder.Property(card => card.Example).HasColumnName("example").HasMaxLength(2000).IsRequired();
        builder.Property(card => card.Thesaurus).HasColumnName("thesaurus").HasMaxLength(2000);
        builder.Property(card => card.Collocation).HasColumnName("collocation").HasMaxLength(2000);
        builder.Property(card => card.Note).HasColumnName("note").HasMaxLength(4000);
        builder.Property(card => card.Interval).HasColumnName("interval").IsRequired();
        builder.Property(card => card.EaseFactor).HasColumnName("ease_factor").IsRequired();
        builder.Property(card => card.Repetitions).HasColumnName("repetitions").IsRequired();
        builder.Property(card => card.NextReviewDate).HasColumnName("next_review_date");
        builder.Property(card => card.State).HasColumnName("state").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(card => card.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(card => card.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(card => card.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<FlashcardDeck>()
            .WithMany()
            .HasForeignKey(card => card.DeckId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(card => new { card.DeckId, card.WordId }).IsUnique();
        builder.HasIndex(card => card.WordId);
        builder.HasIndex(card => new { card.NextReviewDate, card.State });
    }
}
