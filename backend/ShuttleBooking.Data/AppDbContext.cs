using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Shuttle> Shuttles { get; set; } = null!;
    public DbSet<Booking> Bookings { get; set; } = null!;
    public DbSet<User> Users { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.User)
            .WithMany(u => u.Bookings)
            .HasForeignKey(b => b.UserId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Booking>()
            .HasOne(b => b.Shuttle)
            .WithMany(s => s.Bookings)
            .HasForeignKey(b => b.ShuttleId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Booking>()
            .Property(b => b.CreatedAt)
            .HasDefaultValueSql("GETUTCDATE()");

        modelBuilder.Entity<Booking>()
            .HasIndex(b => new { b.UserId, b.ShuttleId, b.Date })
            .HasFilter("[IsCanceled] = 0")
            .IsUnique();
    }
}