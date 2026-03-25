using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data.Interfaces;

public interface IBookingRepository
{
    Task<Booking> CreateAsync(Booking booking);
    Task<Booking?> GetByIdWithDetailsAsync(int id);
    Task<IReadOnlyCollection<Booking>> GetByUserIdAsync(int userId);
    Task<bool> HasActiveBookingAsync(int userId, int shuttleId, DateTime date);
    Task<int> GetActiveBookingCountAsync(int shuttleId, DateTime date);
    Task<Dictionary<int, int>> GetActiveBookingCountsByDateAsync(DateTime date);
    Task SaveChangesAsync();
}