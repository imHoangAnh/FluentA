using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MoveLearningTablesToOwnedSchemas : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_flashcard_cards_flashcard_decks_deck_id",
                table: "flashcard_cards");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_flashcard_decks_deck_id",
                table: "practice_session_summaries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_flashcard_decks",
                table: "flashcard_decks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_flashcard_cards",
                table: "flashcard_cards");

            migrationBuilder.DropPrimaryKey(
                name: "PK_practice_session_summaries",
                table: "practice_session_summaries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_practice_settings",
                table: "practice_settings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_review_settings",
                table: "review_settings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_word_review_histories",
                table: "word_review_histories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_word_review_states",
                table: "word_review_states");

            migrationBuilder.EnsureSchema(
                name: "flashcards");

            migrationBuilder.EnsureSchema(
                name: "practice");

            migrationBuilder.EnsureSchema(
                name: "review");

            migrationBuilder.RenameTable(
                name: "flashcard_decks",
                newName: "decks",
                newSchema: "flashcards");

            migrationBuilder.RenameTable(
                name: "flashcard_cards",
                newName: "cards",
                newSchema: "flashcards");

            migrationBuilder.RenameTable(
                name: "practice_session_summaries",
                newName: "session_summaries",
                newSchema: "practice");

            migrationBuilder.RenameTable(
                name: "practice_settings",
                newName: "settings",
                newSchema: "practice");

            migrationBuilder.RenameTable(
                name: "review_settings",
                newName: "settings",
                newSchema: "review");

            migrationBuilder.RenameTable(
                name: "word_review_histories",
                newName: "word_histories",
                newSchema: "review");

            migrationBuilder.RenameTable(
                name: "word_review_states",
                newName: "word_states",
                newSchema: "review");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_decks_user_id_board_id",
                schema: "flashcards",
                table: "decks",
                newName: "IX_decks_user_id_board_id");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_decks_page_id",
                schema: "flashcards",
                table: "decks",
                newName: "IX_decks_page_id");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_decks_board_id_type",
                schema: "flashcards",
                table: "decks",
                newName: "IX_decks_board_id_type");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_cards_word_id",
                schema: "flashcards",
                table: "cards",
                newName: "IX_cards_word_id");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_cards_next_review_date_state",
                schema: "flashcards",
                table: "cards",
                newName: "IX_cards_next_review_date_state");

            migrationBuilder.RenameIndex(
                name: "IX_flashcard_cards_deck_id_word_id",
                schema: "flashcards",
                table: "cards",
                newName: "IX_cards_deck_id_word_id");

            migrationBuilder.RenameIndex(
                name: "IX_practice_session_summaries_deck_id_completed_at",
                schema: "practice",
                table: "session_summaries",
                newName: "IX_session_summaries_deck_id_completed_at");

            migrationBuilder.RenameIndex(
                name: "IX_practice_session_summaries_user_id_completed_at",
                schema: "practice",
                table: "session_summaries",
                newName: "IX_session_summaries_user_id_completed_at");

            migrationBuilder.RenameIndex(
                name: "IX_word_review_histories_user_id_reviewed_at_active",
                schema: "review",
                table: "word_histories",
                newName: "IX_word_histories_user_id_reviewed_at_active");

            migrationBuilder.RenameIndex(
                name: "IX_word_review_histories_user_id_session_id",
                schema: "review",
                table: "word_histories",
                newName: "IX_word_histories_user_id_session_id");

            migrationBuilder.RenameIndex(
                name: "IX_word_review_histories_word_id_reviewed_at",
                schema: "review",
                table: "word_histories",
                newName: "IX_word_histories_word_id_reviewed_at");

            migrationBuilder.RenameIndex(
                name: "IX_word_review_states_user_id_next_review_date",
                schema: "review",
                table: "word_states",
                newName: "IX_word_states_user_id_next_review_date");

            migrationBuilder.RenameIndex(
                name: "IX_word_review_states_word_id",
                schema: "review",
                table: "word_states",
                newName: "IX_word_states_word_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_decks",
                schema: "flashcards",
                table: "decks",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_cards",
                schema: "flashcards",
                table: "cards",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_session_summaries",
                schema: "practice",
                table: "session_summaries",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_settings",
                schema: "practice",
                table: "settings",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_settings",
                schema: "review",
                table: "settings",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_word_histories",
                schema: "review",
                table: "word_histories",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_word_states",
                schema: "review",
                table: "word_states",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_cards_decks_deck_id",
                schema: "flashcards",
                table: "cards",
                column: "deck_id",
                principalSchema: "flashcards",
                principalTable: "decks",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_session_summaries_decks_deck_id",
                schema: "practice",
                table: "session_summaries",
                column: "deck_id",
                principalSchema: "flashcards",
                principalTable: "decks",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_cards_decks_deck_id",
                schema: "flashcards",
                table: "cards");

            migrationBuilder.DropForeignKey(
                name: "FK_session_summaries_decks_deck_id",
                schema: "practice",
                table: "session_summaries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_decks",
                schema: "flashcards",
                table: "decks");

            migrationBuilder.DropPrimaryKey(
                name: "PK_cards",
                schema: "flashcards",
                table: "cards");

            migrationBuilder.DropPrimaryKey(
                name: "PK_session_summaries",
                schema: "practice",
                table: "session_summaries");

            migrationBuilder.DropPrimaryKey(
                name: "PK_settings",
                schema: "practice",
                table: "settings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_settings",
                schema: "review",
                table: "settings");

            migrationBuilder.DropPrimaryKey(
                name: "PK_word_histories",
                schema: "review",
                table: "word_histories");

            migrationBuilder.DropPrimaryKey(
                name: "PK_word_states",
                schema: "review",
                table: "word_states");

            migrationBuilder.RenameTable(
                name: "decks",
                schema: "flashcards",
                newName: "flashcard_decks");

            migrationBuilder.RenameTable(
                name: "cards",
                schema: "flashcards",
                newName: "flashcard_cards");

            migrationBuilder.RenameTable(
                name: "session_summaries",
                schema: "practice",
                newName: "practice_session_summaries");

            migrationBuilder.RenameTable(
                name: "settings",
                schema: "practice",
                newName: "practice_settings");

            migrationBuilder.RenameTable(
                name: "settings",
                schema: "review",
                newName: "review_settings");

            migrationBuilder.RenameTable(
                name: "word_histories",
                schema: "review",
                newName: "word_review_histories");

            migrationBuilder.RenameTable(
                name: "word_states",
                schema: "review",
                newName: "word_review_states");

            migrationBuilder.RenameIndex(
                name: "IX_decks_user_id_board_id",
                table: "flashcard_decks",
                newName: "IX_flashcard_decks_user_id_board_id");

            migrationBuilder.RenameIndex(
                name: "IX_decks_page_id",
                table: "flashcard_decks",
                newName: "IX_flashcard_decks_page_id");

            migrationBuilder.RenameIndex(
                name: "IX_decks_board_id_type",
                table: "flashcard_decks",
                newName: "IX_flashcard_decks_board_id_type");

            migrationBuilder.RenameIndex(
                name: "IX_cards_word_id",
                table: "flashcard_cards",
                newName: "IX_flashcard_cards_word_id");

            migrationBuilder.RenameIndex(
                name: "IX_cards_next_review_date_state",
                table: "flashcard_cards",
                newName: "IX_flashcard_cards_next_review_date_state");

            migrationBuilder.RenameIndex(
                name: "IX_cards_deck_id_word_id",
                table: "flashcard_cards",
                newName: "IX_flashcard_cards_deck_id_word_id");

            migrationBuilder.RenameIndex(
                name: "IX_session_summaries_deck_id_completed_at",
                table: "practice_session_summaries",
                newName: "IX_practice_session_summaries_deck_id_completed_at");

            migrationBuilder.RenameIndex(
                name: "IX_session_summaries_user_id_completed_at",
                table: "practice_session_summaries",
                newName: "IX_practice_session_summaries_user_id_completed_at");

            migrationBuilder.RenameIndex(
                name: "IX_word_histories_user_id_reviewed_at_active",
                table: "word_review_histories",
                newName: "IX_word_review_histories_user_id_reviewed_at_active");

            migrationBuilder.RenameIndex(
                name: "IX_word_histories_user_id_session_id",
                table: "word_review_histories",
                newName: "IX_word_review_histories_user_id_session_id");

            migrationBuilder.RenameIndex(
                name: "IX_word_histories_word_id_reviewed_at",
                table: "word_review_histories",
                newName: "IX_word_review_histories_word_id_reviewed_at");

            migrationBuilder.RenameIndex(
                name: "IX_word_states_user_id_next_review_date",
                table: "word_review_states",
                newName: "IX_word_review_states_user_id_next_review_date");

            migrationBuilder.RenameIndex(
                name: "IX_word_states_word_id",
                table: "word_review_states",
                newName: "IX_word_review_states_word_id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_flashcard_decks",
                table: "flashcard_decks",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_flashcard_cards",
                table: "flashcard_cards",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_practice_session_summaries",
                table: "practice_session_summaries",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_practice_settings",
                table: "practice_settings",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_review_settings",
                table: "review_settings",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_word_review_histories",
                table: "word_review_histories",
                column: "id");

            migrationBuilder.AddPrimaryKey(
                name: "PK_word_review_states",
                table: "word_review_states",
                column: "id");

            migrationBuilder.AddForeignKey(
                name: "FK_flashcard_cards_flashcard_decks_deck_id",
                table: "flashcard_cards",
                column: "deck_id",
                principalTable: "flashcard_decks",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

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
