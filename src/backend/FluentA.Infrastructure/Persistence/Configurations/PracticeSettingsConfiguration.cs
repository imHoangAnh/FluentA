using FluentA.Domain.BoundedContexts.Auth.Entities;
using FluentA.Domain.BoundedContexts.Practice.Entities;
using FluentA.Domain.BoundedContexts.Review.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class PracticeSettingsConfiguration : IEntityTypeConfiguration<PracticeSettings>
{
    public void Configure(EntityTypeBuilder<PracticeSettings> builder)
    {
        var modeSequenceComparer = new ValueComparer<IReadOnlyList<string>>(
            (left, right) => left!.SequenceEqual(right!, StringComparer.Ordinal),
            value => value.Aggregate(0, (current, item) => HashCode.Combine(current, StringComparer.Ordinal.GetHashCode(item))),
            value => value.ToArray());

        builder.ToTable("practice_settings");
        builder.HasKey(settings => settings.Id);
        builder.Property(settings => settings.Id).HasColumnName("id");
        builder.Property(settings => settings.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(settings => settings.ModeSequence)
            .HasColumnName("mode_sequence")
            .HasConversion(
                value => string.Join('|', value),
                value => value.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
            .IsRequired()
            .Metadata.SetValueComparer(modeSequenceComparer);
        builder.Property(settings => settings.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(settings => settings.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(settings => settings.DeletedAt).HasColumnName("deleted_at");
        builder.HasIndex(settings => settings.UserId).IsUnique().HasDatabaseName("IX_practice_settings_user_id");
        builder.HasOne<User>().WithOne().HasForeignKey<PracticeSettings>(settings => settings.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
