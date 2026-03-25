using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuttleBooking.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingLifecycleAndAvailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings");

            migrationBuilder.AddColumn<DateTime>(
                name: "CanceledAt",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Bookings",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");

            migrationBuilder.AddColumn<bool>(
                name: "IsCanceled",
                table: "Bookings",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId_ShuttleId_Date",
                table: "Bookings",
                columns: new[] { "UserId", "ShuttleId", "Date" },
                unique: true,
                filter: "[IsCanceled] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bookings_UserId_ShuttleId_Date",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CanceledAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IsCanceled",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_UserId",
                table: "Bookings",
                column: "UserId");
        }
    }
}
