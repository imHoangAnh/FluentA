using FluentA.Domain.BoundedContexts.Journal.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class JournalEntryConfiguration : IEntityTypeConfiguration<JournalEntry>
{
    public void Configure(EntityTypeBuilder<JournalEntry> builder)
    {
        builder.ToTable("journal_entries");

        builder.HasKey(entry => entry.Id);

        builder.Property(entry => entry.Id).HasColumnName("id");
        builder.Property(entry => entry.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(entry => entry.Title).HasColumnName("title").HasMaxLength(240).IsRequired();
        builder.Property(entry => entry.Content).HasColumnName("content").HasColumnType("text").IsRequired();
        builder.Property(entry => entry.Preview).HasColumnName("preview").HasMaxLength(100).IsRequired();
        builder.Property(entry => entry.LearningDate).HasColumnName("learning_date").HasColumnType("date");
        builder.Property(entry => entry.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(entry => entry.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(entry => entry.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(entry => new { entry.UserId, entry.CreatedAt });
        builder.HasIndex(entry => new { entry.UserId, entry.LearningDate });
    }
}
