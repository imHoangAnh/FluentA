using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFlashcardSynchronization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "flashcard_cards",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    deck_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    word_class = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    meaning_vn = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    meaning_en = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    thesaurus = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    collocation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    interval = table.Column<int>(type: "integer", nullable: false),
                    ease_factor = table.Column<float>(type: "real", nullable: false),
                    repetitions = table.Column<int>(type: "integer", nullable: false),
                    next_review_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    state = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_flashcard_cards", x => x.id);
                    table.ForeignKey(
                        name: "FK_flashcard_cards_flashcard_decks_deck_id",
                        column: x => x.deck_id,
                        principalTable: "flashcard_decks",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "card_reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    rating = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    interval_after = table.Column<int>(type: "integer", nullable: false),
                    ease_factor_after = table.Column<float>(type: "real", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_card_reviews", x => x.id);
                    table.ForeignKey(
                        name: "FK_card_reviews_flashcard_cards_card_id",
                        column: x => x.card_id,
                        principalTable: "flashcard_cards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_card_reviews_card_id_reviewed_at",
                table: "card_reviews",
                columns: new[] { "card_id", "reviewed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_card_reviews_session_id",
                table: "card_reviews",
                column: "session_id");

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_cards_deck_id_word_id",
                table: "flashcard_cards",
                columns: new[] { "deck_id", "word_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_cards_next_review_date_state",
                table: "flashcard_cards",
                columns: new[] { "next_review_date", "state" });

            migrationBuilder.CreateIndex(
                name: "IX_flashcard_cards_word_id",
                table: "flashcard_cards",
                column: "word_id");

            migrationBuilder.Sql(
                """
                INSERT INTO flashcard_cards (
                    id, deck_id, word_id, word, word_class, meaning_vn, meaning_en,
                    example, thesaurus, collocation, note, interval, ease_factor,
                    repetitions, next_review_date, state, created_at, updated_at, deleted_at)
                SELECT
                    gen_random_uuid(), deck.id, word.id, word.word, lower(word.class),
                    word.meaning_vn, word.meaning_en, word.example, word.thesaurus,
                    word.collocation, word.note, 0, 2.5, 0, NULL, 'New',
                    word.created_at, word.updated_at, NULL
                FROM vocab_words AS word
                INNER JOIN vocab_pages AS page
                    ON page.id = word.page_id AND page.deleted_at IS NULL
                INNER JOIN vocab_boards AS board
                    ON board.id = page.board_id AND board.deleted_at IS NULL
                INNER JOIN flashcard_decks AS deck
                    ON deck.board_id = board.id
                    AND deck.deleted_at IS NULL
                    AND (deck.type = 'AllWords' OR deck.page_id = page.id)
                WHERE word.deleted_at IS NULL;

                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT word.id
                        FROM vocab_words AS word
                        INNER JOIN vocab_pages AS page
                            ON page.id = word.page_id AND page.deleted_at IS NULL
                        INNER JOIN vocab_boards AS board
                            ON board.id = page.board_id AND board.deleted_at IS NULL
                        LEFT JOIN flashcard_cards AS card ON card.word_id = word.id
                        WHERE word.deleted_at IS NULL
                        GROUP BY word.id
                        HAVING count(card.id) <> 2
                    ) THEN
                        RAISE EXCEPTION 'Every active vocabulary word must backfill to exactly two flashcard cards.';
                    END IF;
                END $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "card_reviews");

            migrationBuilder.DropTable(
                name: "flashcard_cards");
        }
    }
}
