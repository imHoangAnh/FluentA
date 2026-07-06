using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RemoveVocabularyBoardPageSortOrder : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vocab_pages_board_id_sort_order",
                table: "vocab_pages");

            migrationBuilder.DropIndex(
                name: "IX_vocab_boards_user_id_sort_order",
                table: "vocab_boards");

            migrationBuilder.DropColumn(
                name: "sort_order",
                table: "vocab_pages");

            migrationBuilder.DropColumn(
                name: "sort_order",
                table: "vocab_boards");

            migrationBuilder.CreateIndex(
                name: "IX_vocab_pages_board_id_created_at",
                table: "vocab_pages",
                columns: new[] { "board_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_created_at",
                table: "vocab_boards",
                columns: new[] { "user_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_vocab_pages_board_id_created_at",
                table: "vocab_pages");

            migrationBuilder.DropIndex(
                name: "IX_vocab_boards_user_id_created_at",
                table: "vocab_boards");

            migrationBuilder.AddColumn<int>(
                name: "sort_order",
                table: "vocab_pages",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "sort_order",
                table: "vocab_boards",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_vocab_pages_board_id_sort_order",
                table: "vocab_pages",
                columns: new[] { "board_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_sort_order",
                table: "vocab_boards",
                columns: new[] { "user_id", "sort_order" });
        }
    }
}
