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
            migrationBuilder.Sql("""
                ALTER TABLE practice_session_summaries
                DROP CONSTRAINT IF EXISTS "FK_practice_session_summaries_flashcard_decks_deck_id";

                UPDATE practice_session_summaries AS summary
                SET deck_id = deck.page_id
                FROM flashcard_decks AS deck
                WHERE deck.id = summary.deck_id
                  AND deck.page_id IS NOT NULL;
                """);

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
            migrationBuilder.Sql("""
                ALTER TABLE practice_session_summaries
                DROP CONSTRAINT IF EXISTS "FK_practice_session_summaries_vocab_pages_page_id";
                """);

            migrationBuilder.RenameColumn(
                name: "page_id",
                table: "practice_session_summaries",
                newName: "deck_id");

            migrationBuilder.RenameIndex(
                name: "IX_practice_session_summaries_page_id_completed_at",
                table: "practice_session_summaries",
                newName: "IX_practice_session_summaries_deck_id_completed_at");

            migrationBuilder.Sql("""
                UPDATE practice_session_summaries AS summary
                SET deck_id = deck.id
                FROM flashcard_decks AS deck
                WHERE deck.page_id = summary.deck_id;
                """);

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
