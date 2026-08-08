using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuttleBooking.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserProfileCompletionFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Club",
                table: "Users",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsProfileCompleted",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Club",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsProfileCompleted",
                table: "Users");
        }
    }
}
