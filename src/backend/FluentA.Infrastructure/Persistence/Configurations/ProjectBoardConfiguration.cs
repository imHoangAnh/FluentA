using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectBoardConfiguration : IEntityTypeConfiguration<ProjectBoard>
{
    public void Configure(EntityTypeBuilder<ProjectBoard> builder)
    {
        builder.ToTable("project_boards");

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

        builder.HasMany(board => board.Milestones)
            .WithOne()
            .HasForeignKey(milestone => milestone.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(board => board.Labels)
            .WithOne()
            .HasForeignKey(label => label.BoardId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Navigation(board => board.Milestones).UsePropertyAccessMode(PropertyAccessMode.Field);
        builder.Navigation(board => board.Labels).UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasIndex(board => new { board.UserId, board.DeletedAt });
        builder.HasIndex(board => new { board.UserId, board.Name });
    }
}
