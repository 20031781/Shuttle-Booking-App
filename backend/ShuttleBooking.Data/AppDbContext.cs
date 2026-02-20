using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Shuttle> Shuttles { get; init; }
    public DbSet<Booking> Bookings { get; set; }
    public DbSet<User> Users { get; set; }
}