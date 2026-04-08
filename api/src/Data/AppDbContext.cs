using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using api.Models;

namespace api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options)
    : IdentityDbContext<ApplicationUser, IdentityRole, string>(options)
{
    public DbSet<Safehouse> Safehouses => Set<Safehouse>();
    public DbSet<Supporter> Supporters => Set<Supporter>();
    public DbSet<Donation> Donations => Set<Donation>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Supporter>(entity =>
        {
            entity.ToTable("supporters");

            entity.HasKey(e => e.SupporterId);

            // Table was created without IDENTITY; keys are assigned in application code.
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id").ValueGeneratedNever();
            entity.Property(e => e.SupporterType).HasColumnName("supporter_type").HasMaxLength(100);
            entity.Property(e => e.DisplayName).HasColumnName("display_name").HasMaxLength(200);
            entity.Property(e => e.OrganizationName).HasColumnName("organization_name").HasMaxLength(200);
            entity.Property(e => e.FirstName).HasColumnName("first_name").HasMaxLength(100);
            entity.Property(e => e.LastName).HasColumnName("last_name").HasMaxLength(100);
            entity.Property(e => e.RelationshipType).HasColumnName("relationship_type").HasMaxLength(50);
            entity.Property(e => e.Region).HasColumnName("region").HasMaxLength(100);
            entity.Property(e => e.Country).HasColumnName("country").HasMaxLength(100);
            entity.Property(e => e.Email).HasColumnName("email").HasMaxLength(256);
            entity.Property(e => e.Phone).HasColumnName("phone").HasMaxLength(50);
            entity.Property(e => e.Status).HasColumnName("status").HasMaxLength(50);
            entity.Property(e => e.CreatedAt).HasColumnName("created_at");
            entity.Property(e => e.FirstDonationDate).HasColumnName("first_donation_date");
            entity.Property(e => e.AcquisitionChannel).HasColumnName("acquisition_channel").HasMaxLength(100);
        });

        modelBuilder.Entity<Donation>(entity =>
        {
            entity.ToTable("donations");

            entity.HasKey(e => e.DonationId);

            entity.Property(e => e.DonationId).HasColumnName("donation_id");
            entity.Property(e => e.SupporterId).HasColumnName("supporter_id");
            entity.Property(e => e.DonationType).HasColumnName("donation_type").HasMaxLength(100);
            entity.Property(e => e.DonationDate).HasColumnName("donation_date");
            entity.Property(e => e.IsRecurring).HasColumnName("is_recurring");
            entity.Property(e => e.CampaignName).HasColumnName("campaign_name").HasMaxLength(200);
            entity.Property(e => e.ChannelSource).HasColumnName("channel_source").HasMaxLength(100);
            entity.Property(e => e.CurrencyCode).HasColumnName("currency_code").HasMaxLength(10);
            entity.Property(e => e.Amount).HasColumnName("amount").HasPrecision(18, 2);
            entity.Property(e => e.EstimatedValue).HasColumnName("estimated_value").HasPrecision(18, 2);
            entity.Property(e => e.ImpactUnit).HasColumnName("impact_unit").HasMaxLength(50);
            entity.Property(e => e.Notes).HasColumnName("notes").HasMaxLength(2000);
            entity.Property(e => e.ReferralPostId).HasColumnName("referral_post_id");
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
