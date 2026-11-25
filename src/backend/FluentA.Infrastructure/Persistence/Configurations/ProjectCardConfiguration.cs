using FluentA.Domain.BoundedContexts.Project.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class ProjectCardConfiguration : IEntityTypeConfiguration<ProjectCard>
{
    public void Configure(EntityTypeBuilder<ProjectCard> builder)
    {
        builder.ToTable("project_cards");

        builder.HasKey(card => card.Id);

        builder.Property(card => card.Id).HasColumnName("id");
        builder.Property(card => card.ColumnId).HasColumnName("column_id").IsRequired();
        builder.Property(card => card.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(card => card.Description).HasColumnName("description").HasMaxLength(4000);
        builder.Property(card => card.Priority).HasColumnName("priority").HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(card => card.Deadline).HasColumnName("deadline").HasColumnType("date");
        builder.Property(card => card.SortOrder).HasColumnName("sort_order").IsRequired();
        builder.Property(card => card.MilestoneId).HasColumnName("milestone_id");
        builder.Property(card => card.LabelId).HasColumnName("label_id");
        builder.Property(card => card.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(card => card.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(card => card.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(card => new { card.ColumnId, card.DeletedAt, card.SortOrder });
        builder.HasIndex(card => card.Deadline);
        builder.HasIndex(card => card.MilestoneId);
        builder.HasIndex(card => card.LabelId);

        builder.HasOne(card => card.Milestone)
            .WithMany()
            .HasForeignKey(card => card.MilestoneId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasOne(card => card.Label)
            .WithMany()
            .HasForeignKey(card => card.LabelId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(card => card.ChecklistItems)
            .WithOne()
            .HasForeignKey(item => item.CardId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(card => card.ChecklistItems).UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}
