using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class VocabularyPracticeReviewRedesign : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_review_sessions_vocab_boards_board_id",
                table: "review_sessions");

            migrationBuilder.DropIndex(
                name: "IX_review_sessions_board_id",
                table: "review_sessions");

            migrationBuilder.DropIndex(
                name: "IX_review_sessions_user_id_board_id_session_date_status",
                table: "review_sessions");

            migrationBuilder.RenameColumn(
                name: "definition",
                table: "vocab_words",
                newName: "context");

            migrationBuilder.RenameColumn(
                name: "note",
                table: "vocab_words",
                newName: "legacy_note");

            migrationBuilder.RenameColumn(
                name: "board_id",
                table: "review_sessions",
                newName: "legacy_board_id");

            migrationBuilder.RenameColumn(
                name: "order_type",
                table: "review_sessions",
                newName: "legacy_order_type");

            migrationBuilder.AlterColumn<Guid>(
                name: "legacy_board_id",
                table: "review_sessions",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "legacy_order_type",
                table: "review_sessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.RenameColumn(
                name: "meaning_vn",
                table: "vocab_words",
                newName: "meaning");

            migrationBuilder.RenameColumn(
                name: "class",
                table: "vocab_words",
                newName: "type");

            migrationBuilder.Sql("""
                UPDATE vocab_words
                SET type = CASE lower(type)
                    WHEN 'adj' THEN 'Adjective'
                    WHEN 'adv' THEN 'Adverb'
                    WHEN 'proverb' THEN 'Expression'
                    ELSE type
                END
                WHERE lower(type) IN ('adj', 'adv', 'proverb');
                """);

            migrationBuilder.AddColumn<string>(
                name: "time_zone_id",
                table: "review_sessions",
                type: "character varying(128)",
                maxLength: 128,
                nullable: true,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "antonyms_snapshot",
                table: "review_session_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "completed_at",
                table: "review_session_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "context_snapshot",
                table: "review_session_items",
                type: "character varying(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "example_snapshot",
                table: "review_session_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ipa_pronunciation_snapshot",
                table: "review_session_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "level_after",
                table: "review_session_items",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "level_before",
                table: "review_session_items",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "meaning_snapshot",
                table: "review_session_items",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "mode",
                table: "review_session_items",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "language_snapshot",
                table: "review_session_items",
                type: "character varying(8)",
                maxLength: 8,
                nullable: false,
                defaultValue: "en");

            migrationBuilder.AddColumn<DateOnly>(
                name: "next_review_date_after",
                table: "review_session_items",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateOnly>(
                name: "next_review_date_before",
                table: "review_session_items",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "position",
                table: "review_session_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "result",
                table: "review_session_items",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "synonyms_snapshot",
                table: "review_session_items",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "type_snapshot",
                table: "review_session_items",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "word_snapshot",
                table: "review_session_items",
                type: "character varying(240)",
                maxLength: 240,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "practice_sessions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    board_language = table.Column<string>(type: "character varying(8)", maxLength: 8, nullable: false),
                    status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    current_item_index = table.Column<int>(type: "integer", nullable: false),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_sessions", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_sessions_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_practice_sessions_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_practice_sessions_vocab_pages_page_id",
                        column: x => x.page_id,
                        principalTable: "vocab_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "review_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    review_session_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: false),
                    mode = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    answer_text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    is_correct = table.Column<bool>(type: "boolean", nullable: false),
                    accuracy_score = table.Column<double>(type: "double precision", nullable: true),
                    completeness_score = table.Column<double>(type: "double precision", nullable: true),
                    feedback_mode = table.Column<string>(type: "character varying(16)", maxLength: 16, nullable: true),
                    feedback_json = table.Column<string>(type: "jsonb", nullable: true),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_review_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_review_attempts_review_session_items_review_session_item_id",
                        column: x => x.review_session_item_id,
                        principalTable: "review_session_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_session_items",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false),
                    word = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    ipa_pronunciation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    context = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    synonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    antonyms = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    current_step = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    already_in_review = table.Column<bool>(type: "boolean", nullable: false),
                    selected_level = table.Column<int>(type: "integer", nullable: true),
                    has_mistake = table.Column<bool>(type: "boolean", nullable: false),
                    is_completed = table.Column<bool>(type: "boolean", nullable: false),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    choice_1_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_2_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_3_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_4_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    choice_1_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_2_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_3_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    choice_4_meaning = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    correct_answer_slot_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_session_items", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_session_items_practice_sessions_practice_session_id",
                        column: x => x.practice_session_id,
                        principalTable: "practice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "practice_attempts",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    practice_session_item_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    submitted_answer = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    answer_slot_id = table.Column<Guid>(type: "uuid", nullable: true),
                    correctness = table.Column<bool>(type: "boolean", nullable: false),
                    duration_ms = table.Column<long>(type: "bigint", nullable: false),
                    attempt_number = table.Column<int>(type: "integer", nullable: true),
                    accuracy_score = table.Column<double>(type: "double precision", nullable: true),
                    completeness_score = table.Column<double>(type: "double precision", nullable: true),
                    assessment_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_practice_attempts", x => x.id);
                    table.ForeignKey(
                        name: "FK_practice_attempts_practice_session_items_practice_session_i~",
                        column: x => x.practice_session_item_id,
                        principalTable: "practice_session_items",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_practice_attempts_practice_sessions_practice_session_id",
                        column: x => x.practice_session_id,
                        principalTable: "practice_sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_user_id_session_date_status",
                table: "review_sessions",
                columns: new[] { "user_id", "session_date", "status" },
                filter: "deleted_at IS NULL");

            migrationBuilder.CreateIndex(
                name: "IX_practice_attempts_practice_session_id_created_at",
                table: "practice_attempts",
                columns: new[] { "practice_session_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_attempts_practice_session_item_id_step",
                table: "practice_attempts",
                columns: new[] { "practice_session_item_id", "step" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_items_practice_session_id_position",
                table: "practice_session_items",
                columns: new[] { "practice_session_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_practice_session_items_word_id",
                table: "practice_session_items",
                column: "word_id");

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_board_id",
                table: "practice_sessions",
                column: "board_id");

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_page_id_started_at",
                table: "practice_sessions",
                columns: new[] { "page_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_practice_sessions_user_id_started_at",
                table: "practice_sessions",
                columns: new[] { "user_id", "started_at" });

            migrationBuilder.CreateIndex(
                name: "IX_review_attempts_review_session_item_id_attempt_number",
                table: "review_attempts",
                columns: new[] { "review_session_item_id", "attempt_number" },
                unique: true,
                filter: "deleted_at IS NULL");

            migrationBuilder.Sql("""
                UPDATE review_sessions
                SET time_zone_id = 'UTC',
                    status = CASE WHEN status IN ('Active', 'Replaced') THEN 'Abandoned' ELSE status END;

                WITH ranked AS (
                    SELECT item.id,
                           ROW_NUMBER() OVER (PARTITION BY item.review_session_id ORDER BY item.created_at, item.id) - 1 AS position
                    FROM review_session_items item
                )
                UPDATE review_session_items item
                SET position = ranked.position,
                    mode = 'dictation'
                FROM ranked
                WHERE ranked.id = item.id;

                UPDATE review_session_items item
                SET word_snapshot = word.word,
                    language_snapshot = board.language,
                    meaning_snapshot = word.meaning,
                    ipa_pronunciation_snapshot = word.ipa_pronunciation,
                    type_snapshot = word.type,
                    context_snapshot = word.context,
                    example_snapshot = word.example,
                    synonyms_snapshot = word.synonyms,
                    antonyms_snapshot = word.antonyms
                FROM vocab_words word
                JOIN vocab_pages page ON page.id = word.page_id
                JOIN vocab_boards board ON board.id = page.board_id
                WHERE word.id = item.vocab_word_id;

                WITH ranked_history AS (
                    SELECT review.session_id,
                           review.word_id,
                           review.result,
                           ROW_NUMBER() OVER (
                               PARTITION BY review.session_id, review.word_id
                               ORDER BY review.reviewed_at DESC, review.id DESC
                           ) AS row_number
                    FROM word_review_histories review
                    WHERE review.deleted_at IS NULL
                )
                UPDATE review_session_items item
                SET result = history.result
                FROM ranked_history history
                WHERE item.is_reviewed
                  AND history.row_number = 1
                  AND history.session_id = item.review_session_id
                  AND history.word_id = item.vocab_word_id;

                UPDATE vocab_board_preferences preference
                SET hidden_columns = COALESCE((
                        SELECT jsonb_agg(to_jsonb(CASE column_name
                            WHEN 'meaningVn' THEN 'meaning'
                            WHEN 'class' THEN 'type'
                            WHEN 'definition' THEN 'context'
                            ELSE column_name END) ORDER BY ordinal)
                        FROM jsonb_array_elements_text(preference.hidden_columns) WITH ORDINALITY AS columns(column_name, ordinal)
                        WHERE column_name <> 'note'
                    ), '[]'::jsonb),
                    column_order = COALESCE((
                        SELECT jsonb_agg(to_jsonb(CASE column_name
                            WHEN 'meaningVn' THEN 'meaning'
                            WHEN 'class' THEN 'type'
                            WHEN 'definition' THEN 'context'
                            ELSE column_name END) ORDER BY ordinal)
                        FROM jsonb_array_elements_text(preference.column_order) WITH ORDINALITY AS columns(column_name, ordinal)
                        WHERE column_name <> 'note'
                    ), '[]'::jsonb),
                    column_widths = COALESCE((
                        SELECT jsonb_object_agg(CASE column_name
                            WHEN 'meaningVn' THEN 'meaning'
                            WHEN 'class' THEN 'type'
                            WHEN 'definition' THEN 'context'
                            ELSE column_name END, column_width)
                        FROM jsonb_each(preference.column_widths) AS columns(column_name, column_width)
                        WHERE column_name <> 'note'
                    ), '{}'::jsonb);
                """);

            migrationBuilder.AlterColumn<string>(
                name: "time_zone_id",
                table: "review_sessions",
                type: "character varying(128)",
                maxLength: 128,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(128)",
                oldMaxLength: 128,
                oldNullable: true,
                oldDefaultValue: "");

            migrationBuilder.CreateIndex(
                name: "IX_review_session_items_review_session_id_position",
                table: "review_session_items",
                columns: new[] { "review_session_id", "position" },
                unique: true,
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $migration$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM review_sessions
                        WHERE legacy_board_id IS NULL OR legacy_order_type IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Cannot roll back boardless Review sessions into the previous board-required schema.';
                    END IF;
                END
                $migration$;
                """);

            migrationBuilder.Sql("UPDATE review_sessions SET status = 'Replaced' WHERE status = 'Abandoned'");

            migrationBuilder.DropTable(
                name: "practice_attempts");

            migrationBuilder.DropTable(
                name: "review_attempts");

            migrationBuilder.DropTable(
                name: "practice_session_items");

            migrationBuilder.DropTable(
                name: "practice_sessions");

            migrationBuilder.DropIndex(
                name: "IX_review_sessions_user_id_session_date_status",
                table: "review_sessions");

            migrationBuilder.DropIndex(
                name: "IX_review_session_items_review_session_id_position",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "time_zone_id",
                table: "review_sessions");

            migrationBuilder.DropColumn(
                name: "antonyms_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "completed_at",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "context_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "example_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "ipa_pronunciation_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "level_after",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "level_before",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "meaning_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "language_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "mode",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "next_review_date_after",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "next_review_date_before",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "position",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "result",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "synonyms_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "type_snapshot",
                table: "review_session_items");

            migrationBuilder.DropColumn(
                name: "word_snapshot",
                table: "review_session_items");

            migrationBuilder.RenameColumn(
                name: "type",
                table: "vocab_words",
                newName: "class");

            migrationBuilder.RenameColumn(
                name: "meaning",
                table: "vocab_words",
                newName: "meaning_vn");

            migrationBuilder.RenameColumn(
                name: "context",
                table: "vocab_words",
                newName: "definition");

            migrationBuilder.RenameColumn(
                name: "legacy_note",
                table: "vocab_words",
                newName: "note");

            migrationBuilder.RenameColumn(
                name: "legacy_board_id",
                table: "review_sessions",
                newName: "board_id");

            migrationBuilder.RenameColumn(
                name: "legacy_order_type",
                table: "review_sessions",
                newName: "order_type");

            migrationBuilder.AlterColumn<Guid>(
                name: "board_id",
                table: "review_sessions",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "order_type",
                table: "review_sessions",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_board_id",
                table: "review_sessions",
                column: "board_id");

            migrationBuilder.CreateIndex(
                name: "IX_review_sessions_user_id_board_id_session_date_status",
                table: "review_sessions",
                columns: new[] { "user_id", "board_id", "session_date", "status" },
                filter: "deleted_at IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_review_sessions_vocab_boards_board_id",
                table: "review_sessions",
                column: "board_id",
                principalTable: "vocab_boards",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
