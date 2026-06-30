using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddFluentAsrsReviewState : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "card_reviews");

            migrationBuilder.DropIndex(
                name: "IX_word_review_states_next_review_date_state",
                table: "word_review_states");

            migrationBuilder.DropColumn(
                name: "ease_factor",
                table: "word_review_states");

            migrationBuilder.DropColumn(
                name: "state",
                table: "word_review_states");

            migrationBuilder.RenameColumn(
                name: "repetitions",
                table: "word_review_states",
                newName: "level");

            migrationBuilder.RenameColumn(
                name: "interval",
                table: "word_review_states",
                newName: "lapse_count");

            migrationBuilder.AddColumn<DateTime>(
                name: "last_reviewed_at",
                table: "word_review_states",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "user_id",
                table: "word_review_states",
                type: "uuid",
                nullable: true);

            migrationBuilder.Sql(
                """
                UPDATE word_review_states AS state
                SET user_id = board.user_id,
                    level = LEAST(GREATEST(state.level, 0), 5),
                    lapse_count = 0,
                    last_reviewed_at = NULL
                FROM vocab_words AS word
                JOIN vocab_pages AS page ON page.id = word.page_id
                JOIN vocab_boards AS board ON board.id = page.board_id
                WHERE state.word_id = word.id;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "user_id",
                table: "word_review_states",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateTable(
                name: "word_review_histories",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    result = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    level_before = table.Column<int>(type: "integer", nullable: false),
                    level_after = table.Column<int>(type: "integer", nullable: false),
                    next_review_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_word_review_histories", x => x.id);
                    table.ForeignKey(
                        name: "FK_word_review_histories_vocab_words_word_id",
                        column: x => x.word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_states_user_id_next_review_date",
                table: "word_review_states",
                columns: new[] { "user_id", "next_review_date" });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_user_id_session_id",
                table: "word_review_histories",
                columns: new[] { "user_id", "session_id" });

            migrationBuilder.CreateIndex(
                name: "IX_word_review_histories_word_id_reviewed_at",
                table: "word_review_histories",
                columns: new[] { "word_id", "reviewed_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "word_review_histories");

            migrationBuilder.DropIndex(
                name: "IX_word_review_states_user_id_next_review_date",
                table: "word_review_states");

            migrationBuilder.DropColumn(
                name: "last_reviewed_at",
                table: "word_review_states");

            migrationBuilder.DropColumn(
                name: "user_id",
                table: "word_review_states");

            migrationBuilder.RenameColumn(
                name: "level",
                table: "word_review_states",
                newName: "repetitions");

            migrationBuilder.RenameColumn(
                name: "lapse_count",
                table: "word_review_states",
                newName: "interval");

            migrationBuilder.AddColumn<float>(
                name: "ease_factor",
                table: "word_review_states",
                type: "real",
                nullable: false,
                defaultValue: 0f);

            migrationBuilder.AddColumn<string>(
                name: "state",
                table: "word_review_states",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "card_reviews",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    card_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ease_factor_after = table.Column<float>(type: "real", nullable: false),
                    interval_after = table.Column<int>(type: "integer", nullable: false),
                    rating = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    reviewed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    session_id = table.Column<Guid>(type: "uuid", nullable: false),
                    time_spent_seconds = table.Column<int>(type: "integer", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
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
                name: "IX_word_review_states_next_review_date_state",
                table: "word_review_states",
                columns: new[] { "next_review_date", "state" });

            migrationBuilder.CreateIndex(
                name: "IX_card_reviews_card_id_reviewed_at",
                table: "card_reviews",
                columns: new[] { "card_id", "reviewed_at" });

            migrationBuilder.CreateIndex(
                name: "IX_card_reviews_session_id",
                table: "card_reviews",
                column: "session_id");
        }
    }
}
