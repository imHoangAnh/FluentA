using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SyncPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            RenameIndexIfNeeded(
                migrationBuilder,
                "review",
                "IX_word_review_histories_user_id_reviewed_at_active",
                "IX_word_histories_user_id_reviewed_at_active");

            RenameIndexIfNeeded(
                migrationBuilder,
                "review",
                "IX_settings_user_id1",
                "IX_review_settings_user_id");

            RenameIndexIfNeeded(
                migrationBuilder,
                "practice",
                "IX_settings_user_id",
                "IX_practice_settings_user_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            RenameIndexIfNeeded(
                migrationBuilder,
                "review",
                "IX_word_histories_user_id_reviewed_at_active",
                "IX_word_review_histories_user_id_reviewed_at_active");

            RenameIndexIfNeeded(
                migrationBuilder,
                "review",
                "IX_review_settings_user_id",
                "IX_settings_user_id1");

            RenameIndexIfNeeded(
                migrationBuilder,
                "practice",
                "IX_practice_settings_user_id",
                "IX_settings_user_id");
        }

        private static void RenameIndexIfNeeded(
            MigrationBuilder migrationBuilder,
            string schema,
            string oldName,
            string newName)
        {
            migrationBuilder.Sql($"""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relkind = 'i'
                          AND n.nspname = '{schema}'
                          AND c.relname = '{oldName}'
                    )
                    AND NOT EXISTS (
                        SELECT 1
                        FROM pg_class c
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE c.relkind = 'i'
                          AND n.nspname = '{schema}'
                          AND c.relname = '{newName}'
                    )
                    THEN
                        ALTER INDEX "{schema}"."{oldName}" RENAME TO "{newName}";
                    END IF;
                END $$;
                """);
        }
    }
}
