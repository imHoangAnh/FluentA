using FluentA.Domain.BoundedContexts.Pomodoro.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PomodoroConfigConfiguration : IEntityTypeConfiguration<PomodoroConfig>
{
    public void Configure(EntityTypeBuilder<PomodoroConfig> builder)
    {
        builder.ToTable("pomodoro_configs");

        builder.HasKey(config => config.Id);

        builder.Property(config => config.Id).HasColumnName("id");
        builder.Property(config => config.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(config => config.WorkMinutes).HasColumnName("work_minutes").IsRequired();
        builder.Property(config => config.ShortBreakMinutes).HasColumnName("short_break_minutes").IsRequired();
        builder.Property(config => config.LongBreakMinutes).HasColumnName("long_break_minutes").IsRequired();
        builder.Property(config => config.LongBreakAfter).HasColumnName("long_break_after").IsRequired();
        builder.Property(config => config.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(config => config.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(config => config.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(config => config.UserId)
            .IsUnique()
            .HasFilter("deleted_at IS NULL");
    }
}
