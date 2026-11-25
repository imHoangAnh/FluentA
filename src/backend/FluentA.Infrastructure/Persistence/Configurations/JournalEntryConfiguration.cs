using FluentA.Domain.BoundedContexts.Journal.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> builder)
    {
        var tagsComparer = new ValueComparer<List<string>>(
            (left, right) => left != null && right != null && left.SequenceEqual(right),
            value => value.Aggregate(0, (hash, item) => HashCode.Combine(hash, item.GetHashCode())),
            value => value.ToList());

        builder.ToTable("journal");

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.Id).HasColumnName("id");
        builder.Property(entry => entry.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(entry => entry.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(entry => entry.Content).HasColumnName("content").HasColumnType("text").IsRequired();
        builder.Property(entry => entry.Date).HasColumnName("date").HasColumnType("date").IsRequired();
        builder.Property(entry => entry.Mood).HasColumnName("mood").HasMaxLength(20);
        builder.Property(entry => entry.IsStarred).HasColumnName("is_starred").HasDefaultValue(false).IsRequired();
        builder.Property(entry => entry.Tags)
            .HasColumnName("tags")
            .HasColumnType("text[]")
            .HasDefaultValueSql("'{}'::text[]")
            .IsRequired()
            .Metadata.SetValueComparer(tagsComparer);
        builder.Property(entry => entry.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(entry => entry.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(entry => entry.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(entry => new { entry.UserId, entry.CreatedAt });
        builder.HasIndex(entry => new { entry.UserId, entry.Date })
            .IsUnique().HasFilter("deleted_at IS NULL").HasDatabaseName("ux_journal_user_date_active");
    }
}
