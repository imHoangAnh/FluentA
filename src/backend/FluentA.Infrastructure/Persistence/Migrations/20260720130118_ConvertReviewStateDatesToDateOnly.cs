using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ConvertReviewStateDatesToDateOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE word_review_states
                ALTER COLUMN next_review_date TYPE date
                USING (next_review_date AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;

                ALTER TABLE word_review_states
                ALTER COLUMN last_reviewed_at TYPE date
                USING (last_reviewed_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                ALTER TABLE word_review_states
                ALTER COLUMN next_review_date TYPE timestamp with time zone
                USING next_review_date::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';

                ALTER TABLE word_review_states
                ALTER COLUMN last_reviewed_at TYPE timestamp with time zone
                USING last_reviewed_at::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
                """);
        }
    }
}
