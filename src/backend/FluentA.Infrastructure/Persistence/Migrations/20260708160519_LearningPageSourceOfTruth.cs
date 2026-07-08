using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class LearningPageSourceOfTruth : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_flashcard_decks_deck_id",
                table: "practice_session_summaries");

            migrationBuilder.RenameColumn(
                name: "deck_id",
                table: "practice_session_summaries",
                newName: "page_id");

            migrationBuilder.RenameIndex(
                name: "IX_practice_session_summaries_deck_id_completed_at",
                table: "practice_session_summaries",
                newName: "IX_practice_session_summaries_page_id_completed_at");

            migrationBuilder.AddForeignKey(
                name: "FK_practice_session_summaries_vocab_pages_page_id",
                table: "practice_session_summaries",
                column: "page_id",
                principalTable: "vocab_pages",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_vocab_pages_page_id",
                table: "practice_session_summaries");

            migrationBuilder.RenameColumn(
                name: "page_id",
                table: "practice_session_summaries",
                newName: "deck_id");

            migrationBuilder.RenameIndex(
                name: "IX_practice_session_summaries_page_id_completed_at",
                table: "practice_session_summaries",
                newName: "IX_practice_session_summaries_deck_id_completed_at");

            migrationBuilder.AddForeignKey(
                name: "FK_practice_session_summaries_flashcard_decks_deck_id",
                table: "practice_session_summaries",
                column: "deck_id",
                principalTable: "flashcard_decks",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
