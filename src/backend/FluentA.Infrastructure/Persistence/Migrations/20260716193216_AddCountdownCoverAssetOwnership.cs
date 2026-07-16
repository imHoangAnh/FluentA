using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FluentA.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCountdownCoverAssetOwnership : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                unique: true,
                filter: "\"cover_asset_id\" IS NOT NULL AND \"deleted_at\" IS NULL");

            migrationBuilder.AddForeignKey(
                name: "FK_countdowns_assets_cover_asset_id",
                table: "countdowns",
                column: "cover_asset_id",
                principalTable: "assets",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_countdowns_assets_cover_asset_id",
                table: "countdowns");

            migrationBuilder.DropIndex(
                name: "IX_countdowns_cover_asset_id",
                table: "countdowns");
        }
    }
}
