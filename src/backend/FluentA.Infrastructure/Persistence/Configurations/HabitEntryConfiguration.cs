using FluentA.Domain.BoundedContexts.Habit.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class HabitEntryConfiguration : IEntityTypeConfiguration<HabitEntry>
{
    public void Configure(EntityTypeBuilder<HabitEntry> builder)
    {
        builder.ToTable("habit_entries");

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.Id).HasColumnName("id");
        builder.Property(entry => entry.HabitId).HasColumnName("habit_id").IsRequired();
        builder.Property(entry => entry.Date).HasColumnName("date").HasColumnType("date").IsRequired();
        builder.Property(entry => entry.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(entry => entry.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(entry => entry.DeletedAt).HasColumnName("deleted_at");

        builder.HasOne<HabitEntity>().WithMany().HasForeignKey(entry => entry.HabitId).OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(entry => new { entry.HabitId, entry.Date }).IsUnique();
        builder.HasIndex(entry => entry.Date);
    }
}
