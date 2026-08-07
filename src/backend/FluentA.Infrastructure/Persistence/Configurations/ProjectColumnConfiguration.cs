using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectColumnConfiguration : IEntityTypeConfiguration<ProjectColumn>
{
    public void Configure(EntityTypeBuilder<ProjectColumn> builder)
    {
        builder.ToTable("project_columns");

        builder.HasKey(column => column.Id);

        builder.Property(column => column.Id).HasColumnName("id");
        builder.Property(column => column.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(column => column.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(column => column.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(column => column.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(column => column.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(column => column.DeletedAt).HasColumnName("deleted_at");

        builder.HasMany(column => column.Cards)
            .WithOne()
            .HasForeignKey(card => card.ColumnId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(column => new { column.BoardId, column.DeletedAt, column.SortOrder });
    }
}
