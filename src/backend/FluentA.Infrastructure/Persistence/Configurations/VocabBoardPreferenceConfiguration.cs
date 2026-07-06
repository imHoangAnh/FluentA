using System.Text.Json;
using FluentA.Domain.BoundedContexts.Vocabulary.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FluentA.Infrastructure.Persistence.Configurations;

public sealed class VocabBoardPreferenceConfiguration : IEntityTypeConfiguration<VocabBoardPreference>
{
    public void Configure(EntityTypeBuilder<VocabBoardPreference> builder)
    {
        var listComparer = new ValueComparer<List<string>>(
            (left, right) => left!.SequenceEqual(right!),
            value => value.Aggregate(0, (current, item) => HashCode.Combine(current, StringComparer.OrdinalIgnoreCase.GetHashCode(item))),
            value => value.ToList());
        var dictionaryComparer = new ValueComparer<Dictionary<string, int>>(
            (left, right) => left!.OrderBy(pair => pair.Key).SequenceEqual(right!.OrderBy(pair => pair.Key)),
            value => value.OrderBy(pair => pair.Key).Aggregate(0, (current, pair) => HashCode.Combine(current, StringComparer.OrdinalIgnoreCase.GetHashCode(pair.Key), pair.Value)),
            value => new Dictionary<string, int>(value, StringComparer.OrdinalIgnoreCase));

        builder.ToTable("vocab_board_preferences");
        builder.HasKey(preference => preference.Id);

        builder.Property(preference => preference.Id).HasColumnName("id");
        builder.Property(preference => preference.UserId).HasColumnName("user_id").IsRequired();
        builder.Property(preference => preference.BoardId).HasColumnName("board_id").IsRequired();
        builder.Property(preference => preference.HiddenColumns)
            .HasColumnName("hidden_columns")
            .HasColumnType("jsonb")
            .HasConversion(
                value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
                value => JsonSerializer.Deserialize<List<string>>(value, (JsonSerializerOptions?)null) ?? new List<string>())
            .Metadata.SetValueComparer(listComparer);
        builder.Property(preference => preference.ColumnOrder)
            .HasColumnName("column_order")
            .HasColumnType("jsonb")
            .HasConversion(
                value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
                value => JsonSerializer.Deserialize<List<string>>(value, (JsonSerializerOptions?)null) ?? new List<string>())
            .Metadata.SetValueComparer(listComparer);
        builder.Property(preference => preference.ColumnWidths)
            .HasColumnName("column_widths")
            .HasColumnType("jsonb")
            .HasConversion(
                value => JsonSerializer.Serialize(value, (JsonSerializerOptions?)null),
                value => JsonSerializer.Deserialize<Dictionary<string, int>>(value, (JsonSerializerOptions?)null)
                    ?? new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase))
            .Metadata.SetValueComparer(dictionaryComparer);
        builder.Property(preference => preference.CreatedAt).HasColumnName("created_at").IsRequired();
        builder.Property(preference => preference.UpdatedAt).HasColumnName("updated_at").IsRequired();
        builder.Property(preference => preference.DeletedAt).HasColumnName("deleted_at");

        builder.HasIndex(preference => new { preference.UserId, preference.BoardId }).IsUnique();
    }
}
