using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddJournalRichTextContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "plain_text_content",
                table: "journal_entries",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql(
                """
                UPDATE journal_entries
                SET plain_text_content = content,
                    content = '<p>' ||
                        replace(
                            replace(
                                replace(
                                    replace(content, '&', '&amp;'),
                                    '<', '&lt;'),
                                '>', '&gt;'),
                            E'\n', '<br>') ||
                        '</p>'
                WHERE plain_text_content = '';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "plain_text_content",
                table: "journal_entries");
        }
    }
}
