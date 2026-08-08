using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuttleBooking.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddUserNotificationPreferences : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "NotifyOnBookingCancellation",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "NotifyOnBookingConfirmation",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "NotifyOnBookingCancellation",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "NotifyOnBookingConfirmation",
                table: "Users");
        }
    }
}
