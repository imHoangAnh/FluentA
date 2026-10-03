using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PreserveLearningHistoryAfterVocabularyDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                WITH ranked_history AS (
                    SELECT review.session_id,
                           review.word_id,
                           review.result,
                           review.reviewed_at,
                           ROW_NUMBER() OVER (
                               PARTITION BY review.session_id, review.word_id
                               ORDER BY review.reviewed_at DESC, review.id DESC
                           ) AS row_number
                    FROM word_review_histories review
                )
                UPDATE review_session_items item
                SET result = COALESCE(item.result, history.result),
                    completed_at = COALESCE(item.completed_at, history.reviewed_at)
                FROM ranked_history history
                WHERE item.is_reviewed
                  AND history.row_number = 1
                  AND history.session_id = item.review_session_id
                  AND history.word_id = item.vocab_word_id;

                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM review_session_items item
                        WHERE btrim(item.word_snapshot) = ''
                           OR btrim(item.meaning_snapshot) = ''
                           OR btrim(item.type_snapshot) = ''
                           OR btrim(item.example_snapshot) = ''
                           OR btrim(item.language_snapshot) = ''
                           OR btrim(item.mode) = ''
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a review item is missing required snapshot data.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM review_session_items item
                        WHERE item.is_reviewed
                          AND (item.result IS NULL OR item.completed_at IS NULL)
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a completed review item has no result or completion time that can be recovered.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM review_session_items item
                        WHERE item.is_reviewed
                          AND NOT EXISTS (
                              SELECT 1
                              FROM review_attempts attempt
                              WHERE attempt.review_session_item_id = item.id
                          )
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a completed review item has no saved answer attempt; its history cannot be preserved completely.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM word_review_histories history
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM review_session_items item
                            WHERE item.review_session_id = history.session_id
                              AND item.vocab_word_id = history.word_id
                              AND item.is_reviewed
                        )
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a review history row cannot be linked to its persisted review item.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM practice_session_summaries summary
                        LEFT JOIN vocab_pages page ON page.id = summary.page_id
                        WHERE page.id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a practice summary has no source page for its page-name snapshot.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_practice_session_summaries_vocab_pages_page_id",
                table: "practice_session_summaries");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_sessions_vocab_boards_board_id",
                table: "practice_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_practice_sessions_vocab_pages_page_id",
                table: "practice_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_review_session_items_vocab_words_vocab_word_id",
                table: "review_session_items");

            migrationBuilder.DropForeignKey(
                name: "FK_word_review_histories_vocab_words_word_id",
                table: "word_review_histories");

            migrationBuilder.DropIndex(
                name: "IX_practice_sessions_board_id",
                table: "practice_sessions");

            migrationBuilder.AddColumn<Guid>(
                name: "review_session_item_id",
                table: "word_review_histories",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "page_name",
                table: "practice_session_summaries",
                type: "character varying(120)",
                maxLength: 120,
                nullable: true);

            migrationBuilder.Sql("""
                UPDATE practice_session_summaries summary
                SET page_name = page.name
                FROM vocab_pages page
                WHERE page.id = summary.page_id;

                WITH ranked_items AS (
                    SELECT history.id AS history_id,
                           item.id AS item_id,
                           ROW_NUMBER() OVER (
                               PARTITION BY history.id
                               ORDER BY item.completed_at DESC NULLS LAST, item.created_at DESC, item.id DESC
                           ) AS row_number
                    FROM word_review_histories history
                    JOIN review_session_items item
                      ON item.review_session_id = history.session_id
                     AND item.vocab_word_id = history.word_id
                     AND item.is_reviewed
                )
                UPDATE word_review_histories history
                SET review_session_item_id = ranked.item_id
                FROM ranked_items ranked
                WHERE ranked.history_id = history.id
                  AND ranked.row_number = 1;

                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM practice_session_summaries
                        WHERE page_name IS NULL OR btrim(page_name) = ''
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a practice summary page name could not be backfilled.';
                    END IF;

                    IF EXISTS (
                        SELECT 1
                        FROM word_review_histories
                        WHERE review_session_item_id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Vocabulary history migration stopped: a review history row has no matching session-item snapshot.';
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<string>(
                name: "page_name",
                table: "practice_session_summaries",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_review_session_item_id",
                table: "word_review_histories",
                column: "review_session_item_id");

            migrationBuilder.AddForeignKey(
                name: "FK_word_review_histories_review_session_items_review_session_i~",
                table: "word_review_histories",
                column: "review_session_item_id",
                principalTable: "review_session_items",
                principalColumn: "id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM practice_sessions session
                        LEFT JOIN vocab_pages page ON page.id = session.page_id
                        LEFT JOIN vocab_boards board ON board.id = session.board_id
                        WHERE page.id IS NULL OR board.id IS NULL
                    ) OR EXISTS (
                        SELECT 1 FROM practice_session_summaries summary
                        LEFT JOIN vocab_pages page ON page.id = summary.page_id
                        WHERE page.id IS NULL
                    ) OR EXISTS (
                        SELECT 1 FROM review_session_items item
                        LEFT JOIN vocab_words word ON word.id = item.vocab_word_id
                        WHERE word.id IS NULL
                    ) OR EXISTS (
                        SELECT 1 FROM word_review_histories history
                        LEFT JOIN vocab_words word ON word.id = history.word_id
                        WHERE word.id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Cannot roll back Vocabulary history retention after Vocabulary rows have been permanently deleted; restore those rows or keep this migration applied.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_word_review_histories_review_session_items_review_session_i~",
                table: "word_review_histories");

            migrationBuilder.DropIndex(
                name: "IX_word_review_histories_review_session_item_id",
                table: "word_review_histories");

            migrationBuilder.DropColumn(
                name: "review_session_item_id",
                table: "word_review_histories");

            migrationBuilder.DropColumn(
                name: "page_name",
                table: "practice_session_summaries");

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_board_id",
                table: "practice_sessions",
                column: "board_id");

            migrationBuilder.AddForeignKey(
                name: "FK_practice_session_summaries_vocab_pages_page_id",
                table: "practice_session_summaries",
                column: "page_id",
                principalTable: "vocab_pages",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_sessions_vocab_boards_board_id",
                table: "practice_sessions",
                column: "board_id",
                principalTable: "vocab_boards",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_practice_sessions_vocab_pages_page_id",
                table: "practice_sessions",
                column: "page_id",
                principalTable: "vocab_pages",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_review_session_items_vocab_words_vocab_word_id",
                table: "review_session_items",
                column: "vocab_word_id",
                principalTable: "vocab_words",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_word_review_histories_vocab_words_word_id",
                table: "word_review_histories",
                column: "word_id",
                principalTable: "vocab_words",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
