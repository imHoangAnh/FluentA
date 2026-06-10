using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVocabularyWordCrud : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "vocab_words",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    page_id = table.Column<Guid>(type: "uuid", nullable: false),
                    word = table.Column<string>(type: "character varying(240)", maxLength: 240, nullable: false),
                    meaning_vn = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    meaning_en = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    @class = table.Column<string>(name: "class", type: "character varying(20)", maxLength: 20, nullable: false),
                    example = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    thesaurus = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    collocation = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    note = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_vocab_words", x => x.id);
                    table.ForeignKey(
                        name: "FK_vocab_words_vocab_pages_page_id",
                        column: x => x.page_id,
                        principalTable: "vocab_pages",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_vocab_words_page_id_created_at",
                table: "vocab_words",
                columns: new[] { "page_id", "created_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "vocab_words");
        }
    }
}
