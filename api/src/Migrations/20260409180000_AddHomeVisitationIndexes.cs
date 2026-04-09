using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace api.Migrations
{
    /// <inheritdoc />
    public partial class AddHomeVisitationIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Speeds up the unfiltered list query (ORDER BY visit_date DESC, visitation_id DESC)
            migrationBuilder.Sql(
                """
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_home_visitations_visit_date'
                    AND object_id = OBJECT_ID('home_visitations')
                )
                CREATE INDEX IX_home_visitations_visit_date
                    ON home_visitations (visit_date DESC, visitation_id DESC);
                """
            );

            // Speeds up the resident-filtered query (WHERE resident_id = ?)
            migrationBuilder.Sql(
                """
                IF NOT EXISTS (
                    SELECT 1 FROM sys.indexes
                    WHERE name = 'IX_home_visitations_resident_id'
                    AND object_id = OBJECT_ID('home_visitations')
                )
                CREATE INDEX IX_home_visitations_resident_id
                    ON home_visitations (resident_id, visit_date DESC, visitation_id DESC);
                """
            );
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS IX_home_visitations_visit_date ON home_visitations;"
            );
            migrationBuilder.Sql(
                "DROP INDEX IF EXISTS IX_home_visitations_resident_id ON home_visitations;"
            );
        }
    }
}
