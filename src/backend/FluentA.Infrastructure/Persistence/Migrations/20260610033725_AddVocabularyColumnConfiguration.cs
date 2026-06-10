using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVocabularyColumnConfiguration : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vocab_column_visibility",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    column_key = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_column_visibility", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_column_visibility_auth_users_user_id",
                        column: x => x.user_id,
                        principalTable: "auth_users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_vocab_column_visibility_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vocab_custom_columns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    board_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_custom_columns", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_custom_columns_vocab_boards_board_id",
                        column: x => x.board_id,
                        principalTable: "vocab_boards",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "vocab_custom_values",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    word_id = table.Column<Guid>(type: "uuid", nullable: false),
                    column_id = table.Column<Guid>(type: "uuid", nullable: false),
                    text_value = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    number_value = table.Column<decimal>(type: "numeric(18,4)", precision: 18, scale: 4, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_custom_values", x => x.id);
                    table.CheckConstraint("ck_vocab_custom_values_one_type", "(text_value IS NOT NULL AND number_value IS NULL) OR (text_value IS NULL AND number_value IS NOT NULL)");
                    table.ForeignKey(
                        name: "FK_vocab_custom_values_vocab_custom_columns_column_id",
                        column: x => x.column_id,
                        principalTable: "vocab_custom_columns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_vocab_custom_values_vocab_words_word_id",
                        column: x => x.word_id,
                        principalTable: "vocab_words",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_column_visibility_board_id",
                table: "vocab_column_visibility",
                column: "board_id");

            migrationBuilder.CreateIndex(
                name: "IX_vocab_column_visibility_user_id_board_id_column_key",
                table: "vocab_column_visibility",
                columns: new[] { "user_id", "board_id", "column_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vocab_custom_columns_board_id_name",
                table: "vocab_custom_columns",
                columns: new[] { "board_id", "name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_vocab_custom_columns_board_id_sort_order",
                table: "vocab_custom_columns",
                columns: new[] { "board_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_custom_values_column_id",
                table: "vocab_custom_values",
                column: "column_id");

            migrationBuilder.CreateIndex(
                name: "IX_vocab_custom_values_word_id_column_id",
                table: "vocab_custom_values",
                columns: new[] { "word_id", "column_id" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vocab_column_visibility");

            migrationBuilder.DropTable(
                name: "vocab_custom_values");

            migrationBuilder.DropTable(
                name: "vocab_custom_columns");
        }
    }
}
