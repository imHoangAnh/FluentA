using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PurgeLegacyAllWordsDecks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                DELETE FROM practice_session_summaries
                WHERE deck_id IN (
                    SELECT id
                    FROM flashcard_decks
                    WHERE type = 'AllWords'
                );
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM card_reviews
                WHERE card_id IN (
                    SELECT card.id
                    FROM flashcard_cards AS card
                    INNER JOIN flashcard_decks AS deck ON deck.id = card.deck_id
                    WHERE deck.type = 'AllWords'
                );
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM flashcard_cards
                WHERE deck_id IN (
                    SELECT id
                    FROM flashcard_decks
                    WHERE type = 'AllWords'
                );
                """);

            migrationBuilder.Sql(
                """
                DELETE FROM flashcard_decks
                WHERE type = 'AllWords';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            throw new NotSupportedException("Legacy AllWords decks were purged destructively and cannot be restored automatically.");
        }
    }
}
