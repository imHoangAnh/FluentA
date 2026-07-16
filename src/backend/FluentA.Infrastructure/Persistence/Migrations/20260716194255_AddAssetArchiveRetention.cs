using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetArchiveRetention : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "archived_at",
                table: "assets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "purge_after_at",
                table: "assets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_assets_status_purge_after_at",
                table: "assets",
                columns: new[] { "status", "purge_after_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_assets_status_purge_after_at",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "archived_at",
                table: "assets");

            migrationBuilder.DropColumn(
                name: "purge_after_at",
                table: "assets");
        }
    }
}
