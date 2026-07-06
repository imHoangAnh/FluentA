using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabBoardConfiguration : IEntityTypeConfiguration<VocabBoard>
{
    public void Configure(EntityTypeBuilder<VocabBoard> builder)
    {
        builder.ToTable("vocab_boards");

        builder.HasKey(board => board.Id);

        builder.Property(board => board.Id).HasColumnName("id");
        builder.Property(board => board.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(board => board.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(board => board.Language).HasColumnName("language").HasMaxLength(8).IsRequired();
        builder.Property(board => board.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(board => board.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(board => board.DeletedAt).HasColumnName("deleted_at");

        builder.HasMany(board => board.Pages)
            .WithOne()
            .HasForeignKey(page => page.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(board => new { board.UserId, board.CreatedAt });
        builder.HasIndex(board => new { board.UserId, board.Name });
    }
}
