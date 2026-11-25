using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectLabelConfiguration : IEntityTypeConfiguration<ProjectLabel>
{
    public void Configure(EntityTypeBuilder<ProjectLabel> builder)
    {
        builder.ToTable("project_labels");

        builder.HasKey(label => label.Id);

        builder.Property(label => label.Id).HasColumnName("id");
        builder.Property(label => label.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(label => label.Name).HasColumnName("name").HasMaxLength(32).IsRequired();
        builder.Property(label => label.NormalizedName).HasColumnName("normalized_name").HasMaxLength(32).IsRequired();
        builder.Property(label => label.Tone).HasColumnName("tone").HasMaxLength(16).IsRequired();
        builder.Property(label => label.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(label => label.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(label => label.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(label => new { label.BoardId, label.NormalizedName })
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
