using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CozyForest.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveGoalImagePath : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImagePath",
                table: "Goals");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImagePath",
                table: "Goals",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
