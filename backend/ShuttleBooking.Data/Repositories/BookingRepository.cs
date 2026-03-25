using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Data.Repositories;

public class BookingRepository(AppDbContext context) : IBookingRepository
{
    public async Task<Booking> CreateAsync(Booking booking)
    {
        context.Bookings.Add(booking);
        await context.SaveChangesAsync();
        return booking;
    }

    public async Task<Booking?> GetByIdWithDetailsAsync(int id) =>
        await context.Bookings
            .Include(b => b.User)
            .Include(b => b.Shuttle)
            .FirstOrDefaultAsync(b => b.Id == id);

    public async Task<IReadOnlyCollection<Booking>> GetByUserIdAsync(int userId) =>
        await context.Bookings
            .AsNoTracking()
            .Include(b => b.Shuttle)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.Date)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync();

    public async Task<bool> HasActiveBookingAsync(int userId, int shuttleId, DateTime date)
    {
        var (start, end) = GetDayRange(date);

        return await context.Bookings.AnyAsync(b =>
            b.UserId == userId &&
            b.ShuttleId == shuttleId &&
            !b.IsCanceled &&
            b.Date >= start &&
            b.Date < end);
    }

    public async Task<int> GetActiveBookingCountAsync(int shuttleId, DateTime date)
    {
        var (start, end) = GetDayRange(date);

        return await context.Bookings.CountAsync(b =>
            b.ShuttleId == shuttleId &&
            !b.IsCanceled &&
            b.Date >= start &&
            b.Date < end);
    }

    public async Task<Dictionary<int, int>> GetActiveBookingCountsByDateAsync(DateTime date)
    {
        var (start, end) = GetDayRange(date);

        return await context.Bookings
            .AsNoTracking()
            .Where(b => !b.IsCanceled && b.Date >= start && b.Date < end)
            .GroupBy(b => b.ShuttleId)
            .Select(group => new { ShuttleId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ShuttleId, item => item.Count);
    }

    public async Task SaveChangesAsync() => await context.SaveChangesAsync();

    private static (DateTime Start, DateTime End) GetDayRange(DateTime date)
    {
        var start = date.Date;
        var end = start.AddDays(1);
        return (start, end);
    }
}