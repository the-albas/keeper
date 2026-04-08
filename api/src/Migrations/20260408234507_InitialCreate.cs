using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "donation_allocations",
                columns: table => new
                {
                    allocation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    donation_id = table.Column<int>(type: "int", nullable: false),
                    safehouse_id = table.Column<int>(type: "int", nullable: false),
                    program_area = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    amount_allocated = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    allocation_date = table.Column<DateOnly>(type: "date", nullable: false),
                    allocation_notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donation_allocations", x => x.allocation_id);
                });

            migrationBuilder.CreateTable(
                name: "donations",
                columns: table => new
                {
                    donation_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    supporter_id = table.Column<int>(type: "int", nullable: false),
                    donation_type = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    donation_date = table.Column<DateOnly>(type: "date", nullable: false),
                    is_recurring = table.Column<bool>(type: "bit", nullable: false),
                    campaign_name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    channel_source = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    currency_code = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: true),
                    amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    estimated_value = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: true),
                    impact_unit = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    notes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    referral_post_id = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_donations", x => x.donation_id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "donation_allocations");

            migrationBuilder.DropTable(
                name: "donations");
        }
    }
}
