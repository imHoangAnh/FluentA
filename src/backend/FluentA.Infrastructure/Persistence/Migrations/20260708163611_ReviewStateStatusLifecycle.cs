using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewStateStatusLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "word_review_states",
                type: "character varying(16)",
                maxLength: 16,
                nullable: false,
                defaultValue: "Active");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_user_id_word_id",
                table: "word_review_states",
                columns: new[] { "user_id", "word_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states",
                column: "word_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_word_review_states_user_id_word_id",
                table: "word_review_states");

            migrationBuilder.DropIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states");

            migrationBuilder.DropColumn(
                name: "status",
                table: "word_review_states");

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states",
                column: "word_id",
                unique: true);
        }
    }
}
