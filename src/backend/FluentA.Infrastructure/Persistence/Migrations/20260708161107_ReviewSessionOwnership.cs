using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ReviewSessionOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "review_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    session_date = table.Column<DateOnly>(type: "date", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_sessions_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_review_sessions_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "review_session_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    vocab_word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_reviewed = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_session_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_session_items_review_sessions_review_session_id",
                        column: x => x.review_session_id,
                        principalTable: "review_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_review_session_items_vocab_words_vocab_word_id",
                        column: x => x.vocab_word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_review_session_id_vocab_word_id",
                table: "review_session_items",
                columns: new[] { "review_session_id", "vocab_word_id" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_vocab_word_id",
                table: "review_session_items",
                column: "vocab_word_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_board_id",
                table: "review_sessions",
                column: "board_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_user_id_board_id_session_date_status",
                table: "review_sessions",
                columns: new[] { "user_id", "board_id", "session_date", "status" },
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "review_session_items");

            migrationBuilder.DropTable(
                name: "review_sessions");
        }
    }
}
