using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using api.Models;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<User> LegacyUsers => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>(entity =>
        {
            entity.ToTable("users");

            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Username).HasColumnName("username").HasMaxLength(50);
            entity.Property(e => e.PasswordHash).HasColumnName("password_hash").HasMaxLength(200);
            entity.Property(e => e.Role).HasColumnName("role").HasConversion<string>().HasMaxLength(20);
            entity.Property(e => e.IsActive).HasColumnName("is_active");
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");

            entity.HasIndex(e => e.Username).IsUnique();
        });

        modelBuilder.Entity<Safehouse>(entity =>
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
