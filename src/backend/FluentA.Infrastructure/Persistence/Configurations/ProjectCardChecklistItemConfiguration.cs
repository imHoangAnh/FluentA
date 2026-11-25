using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectCardChecklistItemConfiguration : IEntityTypeConfiguration<ProjectCardChecklistItem>
{
    public void Configure(EntityTypeBuilder<ProjectCardChecklistItem> builder)
    {
        builder.ToTable("project_card_checklist_items");

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Id).HasColumnName("id");
        builder.Property(item => item.CardId).HasColumnName("card_id").IsRequired();
        builder.Property(item => item.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(item => item.IsCompleted).HasColumnName("is_completed").IsRequired();
        builder.Property(item => item.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(item => item.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(item => item.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(item => item.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(item => new { item.CardId, item.SortOrder });
    }
}
