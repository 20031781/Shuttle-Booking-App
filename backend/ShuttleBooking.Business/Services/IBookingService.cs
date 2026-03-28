using ShuttleBooking.Business.DTOs;

namespace ShuttleBooking.Business.Services;

public interface IBookingService
{
    Task<BookingActionResponse> CreateBookingAsync(int userId, CreateBookingRequest request, string? idempotencyKey);
    Task<BookingActionResponse> CancelBookingAsync(int userId, int bookingId);
    Task<IReadOnlyCollection<BookingDto>> GetUserHistoryAsync(int userId);
    Task<IReadOnlyCollection<ShuttleAvailabilityDto>> GetShuttleAvailabilityAsync(DateTime date);
}