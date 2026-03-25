using ShuttleBooking.Business.DTOs;

namespace ShuttleBooking.Business.Services;

public interface IBookingService
{
    Task<BookingActionResponse> CreateBookingAsync(CreateBookingRequest request);
    Task<BookingActionResponse> CancelBookingAsync(int bookingId, CancelBookingRequest request);
    Task<IReadOnlyCollection<BookingDto>> GetUserHistoryAsync(string email);
    Task<IReadOnlyCollection<ShuttleAvailabilityDto>> GetShuttleAvailabilityAsync(DateTime date);
}