using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Note.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class NoteBoardConfiguration : IEntityTypeConfiguration<NoteBoard>
{
    public void Configure(EntityTypeBuilder<NoteBoard> builder)
    {
        builder.ToTable("note_boards");

        builder.HasKey(board => board.Id);

        builder.Property(board => board.Id).HasColumnName("id");
        builder.Property(board => board.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(board => board.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(board => board.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(board => board.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(board => board.DeletedAt).HasColumnName("deleted_at");

        builder.HasMany(board => board.Pages)
            .WithOne()
            .HasForeignKey(page => page.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(board => board.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasIndex(board => new { board.UserId, board.CreatedAt });
        builder.HasIndex(board => new { board.UserId, board.Name });
    }
}
