using FluentA.Domain.BoundedContexts.Kanban.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class KanbanBoardConfiguration : IEntityTypeConfiguration<KanbanBoard>
{
    public void Configure(EntityTypeBuilder<KanbanBoard> builder)
    {
        builder.ToTable("kanban_boards");

        builder.HasKey(board => board.Id);

        builder.Property(board => board.Id).HasColumnName("id");
        builder.Property(board => board.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(board => board.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(board => board.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(board => board.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(board => board.DeletedAt).HasColumnName("deleted_at");

        builder.HasMany(board => board.Columns)
            .WithOne()
            .HasForeignKey(column => column.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(board => new { board.UserId, board.DeletedAt });
        builder.HasIndex(board => new { board.UserId, board.Name });
    }
}
