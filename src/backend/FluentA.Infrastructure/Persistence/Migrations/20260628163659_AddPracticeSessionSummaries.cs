using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPracticeSessionSummaries : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "practice_session_summaries",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    deck_id = table.Column<Guid>(type: "uuid", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    total_cards = table.Column<int>(type: "integer", nullable: false),
                    correct_cards = table.Column<int>(type: "integer", nullable: false),
                    wrong_cards = table.Column<int>(type: "integer", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_session_summaries", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_session_summaries_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_practice_session_summaries_flashcard_decks_deck_id",
                        column: x => x.deck_id,
                        principalTable: "flashcard_decks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_deck_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "deck_id", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_summaries_user_id_completed_at",
                table: "practice_session_summaries",
                columns: new[] { "user_id", "completed_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "practice_session_summaries");
        }
    }
}
