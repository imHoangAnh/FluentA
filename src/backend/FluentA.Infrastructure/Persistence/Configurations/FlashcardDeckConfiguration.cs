using FluentA.Domain.BoundedContexts.Flashcards.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class FlashcardDeckConfiguration : IEntityTypeConfiguration<FlashcardDeck>
{
    public void Configure(EntityTypeBuilder<FlashcardDeck> builder)
    {
        builder.ToTable("decks", "flashcards");

        builder.HasKey(deck => deck.Id);

        builder.Property(deck => deck.Id).HasColumnName("id");
        builder.Property(deck => deck.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(deck => deck.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(deck => deck.PageId).HasColumnName("page_id");
        builder.Property(deck => deck.Name).HasColumnName("name").HasMaxLength(240).IsRequired();
        builder.Property(deck => deck.Type).HasColumnName("type").HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(deck => deck.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(deck => deck.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(deck => deck.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(deck => new { deck.UserId, deck.BoardId });
        builder.HasIndex(deck => new { deck.BoardId, deck.Type });
        builder.HasIndex(deck => deck.PageId).IsUnique().HasFilter("page_id IS NOT NULL");
    }
}
