using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVocabularyBoardPageManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "flashcard_decks",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: true),
                    name = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_flashcard_decks", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vocab_boards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_boards", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "vocab_pages",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_pages", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_pages_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_decks_board_id_type",
                table: "flashcard_decks",
                columns: new[] { "board_id", "type" });

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_decks_page_id",
                table: "flashcard_decks",
                column: "page_id",
                unique: true,
                filter: "page_id IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_decks_user_id_board_id",
                table: "flashcard_decks",
                columns: new[] { "user_id", "board_id" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_name",
                table: "vocab_boards",
                columns: new[] { "user_id", "name" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_boards_user_id_sort_order",
                table: "vocab_boards",
                columns: new[] { "user_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_pages_board_id_sort_order",
                table: "vocab_pages",
                columns: new[] { "board_id", "sort_order" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "flashcard_decks");

            migrationBuilder.DropTable(
                name: "vocab_pages");

            migrationBuilder.DropTable(
                name: "vocab_boards");
        }
    }
}
