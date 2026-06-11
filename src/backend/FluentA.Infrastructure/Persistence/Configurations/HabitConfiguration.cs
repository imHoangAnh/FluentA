using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using HabitEntity = FluentA.Domain.BoundedContexts.Habit.Entities.Habit;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class HabitConfiguration : IEntityTypeConfiguration<HabitEntity>
{
    public void Configure(EntityTypeBuilder<HabitEntity> builder)
    {
        builder.ToTable("habits");

        builder.HasKey(habit => habit.Id);

        builder.Property(habit => habit.Id).HasColumnName("id");
        builder.Property(habit => habit.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(habit => habit.Name).HasColumnName("name").HasMaxLength(180).IsRequired();
        builder.Property(habit => habit.Description).HasColumnName("description").HasMaxLength(2000);
        builder.Property(habit => habit.Color).HasColumnName("color").HasMaxLength(7);
        builder.Property(habit => habit.Icon).HasColumnName("icon").HasMaxLength(16);
        builder.Property(habit => habit.Frequency).HasColumnName("frequency").HasConversion<string>().HasMaxLength(20).IsRequired();
        builder.Property(habit => habit.CustomDays).HasColumnName("custom_days").HasMaxLength(120);
        builder.Property(habit => habit.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(habit => habit.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(habit => habit.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(habit => habit.UserId);
        builder.HasIndex(habit => new { habit.UserId, habit.Name });
        builder.Ignore(habit => habit.ScheduledCustomDays);
    }
}
