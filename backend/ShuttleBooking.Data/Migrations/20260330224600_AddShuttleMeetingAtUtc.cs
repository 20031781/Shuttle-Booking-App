using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ShuttleBooking.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddShuttleMeetingAtUtc : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "MeetingAtUtc",
                table: "Shuttles",
                type: "datetime2",
                nullable: false,
                defaultValueSql: "GETUTCDATE()");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MeetingAtUtc",
                table: "Shuttles");
        }
    }
}
