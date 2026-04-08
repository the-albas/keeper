using api.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<Safehouse>(entity =>
        {
            entity.ToTable("safehouses");

            entity.HasKey(e => e.SafehouseId);

            entity.Property(e => e.SafehouseId).HasColumnName("safehouse_id");
            entity.Property(e => e.SafehouseCode).HasColumnName("safehouse_code").HasMaxLength(20);
            entity.Property(e => e.Name).HasColumnName("name").HasMaxLength(200);
            entity.Property(e => e.Region).HasColumnName("region").HasMaxLength(100);
            entity.Property(e => e.City).HasColumnName("city").HasMaxLength(100);
            entity.Property(e => e.Province).HasColumnName("province").HasMaxLength(100);
            entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100);
            entity.Property(e => e.OpenDate).HasColumnName("open_date");
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
            entity.Property(e => e.CapacityGirls).HasColumnName("capacity_girls");
            entity.Property(e => e.CapacityStaff).HasColumnName("capacity_staff");
            entity.Property(e => e.CurrentOccupancy).HasColumnName("current_occupancy");
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(1000);
        });
    }
}
