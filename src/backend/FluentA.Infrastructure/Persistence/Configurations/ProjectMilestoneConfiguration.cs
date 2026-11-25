using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectMilestoneConfiguration : IEntityTypeConfiguration<ProjectMilestone>
{
    public void Configure(EntityTypeBuilder<ProjectMilestone> builder)
    {
        builder.ToTable("project_milestones");

        builder.HasKey(milestone => milestone.Id);

        builder.Property(milestone => milestone.Id).HasColumnName("id");
        builder.Property(milestone => milestone.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(milestone => milestone.Name).HasColumnName("name").HasMaxLength(120).IsRequired();
        builder.Property(milestone => milestone.NormalizedName).HasColumnName("normalized_name").HasMaxLength(120).IsRequired();
        builder.Property(milestone => milestone.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(milestone => milestone.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(milestone => milestone.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(milestone => milestone.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(milestone => new { milestone.BoardId, milestone.SortOrder });
        builder.HasIndex(milestone => new { milestone.BoardId, milestone.NormalizedName })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
