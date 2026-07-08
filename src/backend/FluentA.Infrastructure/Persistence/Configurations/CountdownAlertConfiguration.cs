using FluentA.Domain.BoundedContexts.Countdown.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class CountdownAlertConfiguration : IEntityTypeConfiguration<CountdownAlert>
{
    public void Configure(EntityTypeBuilder<CountdownAlert> builder)
    {
        builder.ToTable("countdown_alerts");

        builder.HasKey(alert => alert.Id);

        builder.Property(alert => alert.Id).HasColumnName("id");
        builder.Property(alert => alert.CountdownId).HasColumnName("countdown_id").IsRequired();
        builder.Property(alert => alert.AlertDay).HasColumnName("alert_day").HasMaxLength(32).IsRequired();
        builder.Property(alert => alert.AlertTime).HasColumnName("alert_time").HasMaxLength(5).IsRequired();
        builder.Property(alert => alert.ScheduledAtUtc).HasColumnName("scheduled_at_utc").HasColumnType("timestamp with time zone").IsRequired();
        builder.Property(alert => alert.FiredAtUtc).HasColumnName("fired_at_utc").HasColumnType("timestamp with time zone");
        builder.Property(alert => alert.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(alert => alert.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(alert => alert.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(alert => new { alert.CountdownId, alert.ScheduledAtUtc });
    }
}
