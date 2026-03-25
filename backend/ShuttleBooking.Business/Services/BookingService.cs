using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class BookingService(
    IBookingRepository bookingRepository,
    IUserRepository userRepository,
    IShuttleRepository shuttleRepository) : IBookingService
{
    public async Task<BookingActionResponse> CreateBookingAsync(CreateBookingRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.UserEmail);
        var bookingDate = request.Date.Date;
        if (bookingDate < DateTime.UtcNow.Date)
            throw new InvalidOperationException("Non puoi creare prenotazioni su date passate.");

        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new KeyNotFoundException($"Utente con email {normalizedEmail} non trovato.");
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(request.ShuttleId)
                      ?? throw new KeyNotFoundException($"Shuttle con ID {request.ShuttleId} non trovato.");

        var hasExistingBooking = await bookingRepository.HasActiveBookingAsync(user.Id, shuttle.Id, bookingDate);
        if (hasExistingBooking)
            throw new InvalidOperationException(
                "Hai già una prenotazione attiva per questo shuttle nella stessa data.");

        var activeCount = await bookingRepository.GetActiveBookingCountAsync(shuttle.Id, bookingDate);
        if (activeCount >= shuttle.Capacity)
            throw new InvalidOperationException("Posti esauriti per lo shuttle selezionato.");

        var booking = new Booking
        {
            UserId = user.Id,
            ShuttleId = shuttle.Id,
            Date = bookingDate,
            CreatedAt = DateTime.UtcNow
        };

        var createdBooking = await bookingRepository.CreateAsync(booking);
        var seatsRemaining = shuttle.Capacity - (activeCount + 1);

        return new BookingActionResponse
        {
            Booking = Map(createdBooking, user.Email, shuttle.Name),
            SeatsRemaining = seatsRemaining
        };
    }

    public async Task<BookingActionResponse> CancelBookingAsync(int bookingId, CancelBookingRequest request)
    {
        var normalizedEmail = NormalizeEmail(request.UserEmail);
        var booking = await bookingRepository.GetByIdWithDetailsAsync(bookingId)
                      ?? throw new KeyNotFoundException($"Prenotazione con ID {bookingId} non trovata.");

        if (booking.User == null || booking.Shuttle == null)
            throw new InvalidOperationException("Dati prenotazione incompleti.");

        if (!string.Equals(booking.User.Email, normalizedEmail, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Non puoi annullare una prenotazione di un altro utente.");

        if (!booking.IsCanceled)
        {
            booking.IsCanceled = true;
            booking.CanceledAt = DateTime.UtcNow;
            await bookingRepository.SaveChangesAsync();
        }

        var activeCount = await bookingRepository.GetActiveBookingCountAsync(booking.ShuttleId, booking.Date);
        var seatsRemaining = booking.Shuttle.Capacity - activeCount;

        return new BookingActionResponse
        {
            Booking = Map(booking, booking.User.Email, booking.Shuttle.Name),
            SeatsRemaining = seatsRemaining
        };
    }

    public async Task<IReadOnlyCollection<BookingDto>> GetUserHistoryAsync(string email)
    {
        var normalizedEmail = NormalizeEmail(email);
        var user = await userRepository.GetByEmailAsync(normalizedEmail)
                   ?? throw new KeyNotFoundException($"Utente con email {normalizedEmail} non trovato.");

        var bookings = await bookingRepository.GetByUserIdAsync(user.Id);
        return bookings
            .Select(booking => Map(booking, user.Email, booking.Shuttle?.Name ?? string.Empty))
            .ToList();
    }

    public async Task<IReadOnlyCollection<ShuttleAvailabilityDto>> GetShuttleAvailabilityAsync(DateTime date)
    {
        var requestedDate = date.Date;
        var shuttles = await shuttleRepository.GetAllShuttlesAsync();
        var countsByShuttle = await bookingRepository.GetActiveBookingCountsByDateAsync(requestedDate);

        return shuttles
            .Select(shuttle =>
            {
                countsByShuttle.TryGetValue(shuttle.Id, out var bookingsCount);

                return new ShuttleAvailabilityDto
                {
                    ShuttleId = shuttle.Id,
                    SeatsAvailable = Math.Max(0, shuttle.Capacity - bookingsCount),
                    Date = requestedDate
                };
            })
            .ToList();
    }

    private static BookingDto Map(Booking booking, string userEmail, string shuttleName) =>
        new()
        {
            Id = booking.Id,
            UserId = booking.UserId,
            UserEmail = userEmail,
            ShuttleId = booking.ShuttleId,
            ShuttleName = shuttleName,
            Date = booking.Date,
            CreatedAt = booking.CreatedAt,
            IsCanceled = booking.IsCanceled,
            CanceledAt = booking.CanceledAt
        };

    private static string NormalizeEmail(string email) => email.Trim().ToLowerInvariant();
}