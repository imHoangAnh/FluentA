using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddWordReviewStates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "word_review_states",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    interval = table.Column<int>(type: "integer", nullable: false),
                    ease_factor = table.Column<float>(type: "real", nullable: false),
                    repetitions = table.Column<int>(type: "integer", nullable: false),
                    next_review_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    state = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_word_review_states", x => x.id);
                    table.ForeignKey(
                        name: "FK_word_review_states_vocab_words_word_id",
                        column: x => x.word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_next_review_date_state",
                table: "word_review_states",
                columns: new[] { "next_review_date", "state" });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_word_id",
                table: "word_review_states",
                column: "word_id",
                unique: true);

            migrationBuilder.Sql(
                """
                INSERT INTO word_review_states (
                    id,
                    word_id,
                    interval,
                    ease_factor,
                    repetitions,
                    next_review_date,
                    state,
                    created_at,
                    updated_at,
                    deleted_at)
                SELECT
                    gen_random_uuid(),
                    card.word_id,
                    card.interval,
                    card.ease_factor,
                    card.repetitions,
                    card.next_review_date,
                    card.state,
                    card.created_at,
                    card.updated_at,
                    NULL
                FROM flashcard_cards AS card
                INNER JOIN vocab_words AS word
                    ON word.id = card.word_id
                INNER JOIN flashcard_decks AS deck
                    ON deck.id = card.deck_id
                WHERE card.deleted_at IS NULL
                    AND word.deleted_at IS NULL
                    AND deck.deleted_at IS NULL
                    AND card.next_review_date IS NOT NULL
                    AND (
                        card.state <> 'New'
                        OR card.interval <> 0
                        OR card.repetitions <> 0
                        OR card.ease_factor <> 2.5
                    );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "word_review_states");
        }
    }
}
