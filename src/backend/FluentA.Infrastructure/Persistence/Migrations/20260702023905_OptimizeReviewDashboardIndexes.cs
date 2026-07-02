using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class OptimizeReviewDashboardIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS public.\"IX_word_review_states_user_id_next_review_date\";",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS public.\"IX_word_review_histories_user_id_session_id\";",
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_word_review_states_user_id_next_review_date"
                ON public.word_review_states (user_id, next_review_date)
                WHERE deleted_at IS NULL;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_word_review_histories_user_id_reviewed_at_active"
                ON public.word_review_histories (user_id, reviewed_at)
                WHERE deleted_at IS NULL;
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_word_review_histories_user_id_session_id"
                ON public.word_review_histories (user_id, session_id)
                WHERE deleted_at IS NULL;
                """,
                suppressTransaction: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS public.\"IX_word_review_states_user_id_next_review_date\";",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS public.\"IX_word_review_histories_user_id_reviewed_at_active\";",
                suppressTransaction: true);

            migrationBuilder.Sql(
                "DROP INDEX CONCURRENTLY IF EXISTS public.\"IX_word_review_histories_user_id_session_id\";",
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_word_review_states_user_id_next_review_date"
                ON public.word_review_states (user_id, next_review_date);
                """,
                suppressTransaction: true);

            migrationBuilder.Sql(
                """
                CREATE INDEX CONCURRENTLY IF NOT EXISTS "IX_word_review_histories_user_id_session_id"
                ON public.word_review_histories (user_id, session_id);
                """,
                suppressTransaction: true);
        }
    }
}
