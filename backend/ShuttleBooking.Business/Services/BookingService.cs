using System.Collections.Concurrent;
using System.Data;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Data;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Business.Services;

public class BookingService(AppDbContext dbContext) : IBookingService
{
    private static readonly ConcurrentDictionary<string, SemaphoreSlim> BookingLocks = new();

    public async Task<BookingActionResponse> CreateBookingAsync(int userId, CreateBookingRequest request,
        string? idempotencyKey)
    {
        var bookingDate = request.Date.Date;
        if (bookingDate < DateTime.UtcNow.Date)
            throw new InvalidOperationException("Non puoi creare prenotazioni su date passate.");

        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        var lockKey = $"{request.ShuttleId}:{bookingDate:yyyyMMdd}";
        var bookingLock = BookingLocks.GetOrAdd(lockKey, _ => new SemaphoreSlim(1, 1));
        await bookingLock.WaitAsync();
        try
        {
            var normalizedIdempotencyKey = NormalizeIdempotencyKey(idempotencyKey);
            if (!string.IsNullOrWhiteSpace(normalizedIdempotencyKey))
            {
                var existingByKey = await GetByUserAndIdempotencyKeyAsync(userId, normalizedIdempotencyKey);
                if (existingByKey != null) return await BuildIdempotentReplayResponseAsync(existingByKey, request);
            }

            await using var transaction = await BeginSerializableTransactionIfSupportedAsync();
            try
            {
                var shuttle = await GetShuttleForUpdateAsync(request.ShuttleId)
                              ?? throw new KeyNotFoundException($"Shuttle con ID {request.ShuttleId} non trovato.");

                var hasExistingBooking = await HasActiveBookingAsync(userId, shuttle.Id, bookingDate);
                if (hasExistingBooking)
                    throw new InvalidOperationException(
                        "Hai già una prenotazione attiva per questo shuttle nella stessa data.");

                var activeCount = await GetActiveBookingCountAsync(shuttle.Id, bookingDate);
                if (activeCount >= shuttle.Capacity)
                    throw new InvalidOperationException("Posti esauriti per lo shuttle selezionato.");

                var booking = new Booking
                {
                    UserId = userId,
                    ShuttleId = shuttle.Id,
                    Date = bookingDate,
                    CreatedAt = DateTime.UtcNow,
                    IdempotencyKey = normalizedIdempotencyKey
                };

                dbContext.Bookings.Add(booking);
                await dbContext.SaveChangesAsync();
                if (transaction != null) await transaction.CommitAsync();

                return new BookingActionResponse
                {
                    Booking = Map(booking, user.Email, shuttle.Name),
                    SeatsRemaining = shuttle.Capacity - (activeCount + 1),
                    IsIdempotentReplay = false
                };
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex) &&
                                               !string.IsNullOrWhiteSpace(normalizedIdempotencyKey))
            {
                if (transaction != null) await transaction.RollbackAsync();

                var existingByKey = await GetByUserAndIdempotencyKeyAsync(userId, normalizedIdempotencyKey!);
                if (existingByKey != null) return await BuildIdempotentReplayResponseAsync(existingByKey, request);

                throw new InvalidOperationException("Richiesta duplicata non valida.");
            }
            catch (DbUpdateException ex) when (IsUniqueConstraintViolation(ex))
            {
                if (transaction != null) await transaction.RollbackAsync();
                throw new InvalidOperationException(
                    "Hai già una prenotazione attiva per questo shuttle nella stessa data.");
            }
        }
        finally
        {
            bookingLock.Release();
        }
    }

    public async Task<BookingActionResponse> CancelBookingAsync(int userId, int bookingId)
    {
        await using var transaction = await BeginSerializableTransactionIfSupportedAsync();

        var booking = await dbContext.Bookings
                          .Include(b => b.User)
                          .Include(b => b.Shuttle)
                          .SingleOrDefaultAsync(b => b.Id == bookingId)
                      ?? throw new KeyNotFoundException($"Prenotazione con ID {bookingId} non trovata.");

        if (booking.User == null || booking.Shuttle == null)
            throw new InvalidOperationException("Dati prenotazione incompleti.");

        if (booking.UserId != userId)
            throw new UnauthorizedAccessException("Non puoi annullare una prenotazione di un altro utente.");

        if (!booking.IsCanceled)
        {
            booking.IsCanceled = true;
            booking.CanceledAt = DateTime.UtcNow;
            try
            {
                await dbContext.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw new InvalidOperationException("La prenotazione è stata modificata da un'altra richiesta.");
            }
        }

        var activeCount = await GetActiveBookingCountAsync(booking.ShuttleId, booking.Date);
        if (transaction != null) await transaction.CommitAsync();

        return new BookingActionResponse
        {
            Booking = Map(booking, booking.User.Email, booking.Shuttle.Name),
            SeatsRemaining = booking.Shuttle.Capacity - activeCount,
            IsIdempotentReplay = false
        };
    }

    public async Task<IReadOnlyCollection<BookingDto>> GetUserHistoryAsync(int userId)
    {
        var user = await dbContext.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId)
                   ?? throw new KeyNotFoundException($"Utente con ID {userId} non trovato.");

        var bookings = await dbContext.Bookings
            .AsNoTracking()
            .Include(b => b.Shuttle)
            .Where(b => b.UserId == userId)
            .OrderByDescending(b => b.Date)
            .ThenByDescending(b => b.CreatedAt)
            .ToListAsync();

        return bookings
            .Select(booking => Map(booking, user.Email, booking.Shuttle?.Name ?? string.Empty))
            .ToList();
    }

    public async Task<IReadOnlyCollection<ShuttleAvailabilityDto>> GetShuttleAvailabilityAsync(DateTime date)
    {
        var requestedDate = date.Date;
        var shuttles = await dbContext.Shuttles
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();

        var countsByShuttle = await dbContext.Bookings
            .AsNoTracking()
            .Where(b => !b.IsCanceled && b.Date >= requestedDate && b.Date < requestedDate.AddDays(1))
            .GroupBy(b => b.ShuttleId)
            .Select(group => new { ShuttleId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(item => item.ShuttleId, item => item.Count);

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

    private async Task<bool> HasActiveBookingAsync(int userId, int shuttleId, DateTime date)
    {
        var (start, end) = GetDayRange(date);
        return await dbContext.Bookings.AnyAsync(b =>
            b.UserId == userId &&
            b.ShuttleId == shuttleId &&
            !b.IsCanceled &&
            b.Date >= start &&
            b.Date < end);
    }

    private async Task<int> GetActiveBookingCountAsync(int shuttleId, DateTime date)
    {
        var (start, end) = GetDayRange(date);
        return await dbContext.Bookings.CountAsync(b =>
            b.ShuttleId == shuttleId &&
            !b.IsCanceled &&
            b.Date >= start &&
            b.Date < end);
    }

    private async Task<Booking?> GetByUserAndIdempotencyKeyAsync(int userId, string idempotencyKey) =>
        await dbContext.Bookings
            .Include(b => b.User)
            .Include(b => b.Shuttle)
            .FirstOrDefaultAsync(b => b.UserId == userId && b.IdempotencyKey == idempotencyKey);

    private async Task<BookingActionResponse> BuildIdempotentReplayResponseAsync(Booking existingBooking,
        CreateBookingRequest request)
    {
        var requestedDate = request.Date.Date;
        if (existingBooking.ShuttleId != request.ShuttleId || existingBooking.Date.Date != requestedDate)
            throw new InvalidOperationException("La chiave di idempotenza è già stata usata con un payload diverso.");

        if (existingBooking.User == null || existingBooking.Shuttle == null)
            throw new InvalidOperationException("Dati prenotazione incompleti.");

        var activeCount = await GetActiveBookingCountAsync(existingBooking.ShuttleId, requestedDate);
        var seatsRemaining = Math.Max(0, existingBooking.Shuttle.Capacity - activeCount);

        return new BookingActionResponse
        {
            Booking = Map(existingBooking, existingBooking.User.Email, existingBooking.Shuttle.Name),
            SeatsRemaining = seatsRemaining,
            IsIdempotentReplay = true
        };
    }

    private static (DateTime Start, DateTime End) GetDayRange(DateTime date)
    {
        var start = date.Date;
        var end = start.AddDays(1);
        return (start, end);
    }

    private static string? NormalizeIdempotencyKey(string? idempotencyKey)
    {
        if (string.IsNullOrWhiteSpace(idempotencyKey)) return null;

        var normalized = idempotencyKey.Trim();
        return normalized.Length > 80 ? normalized[..80] : normalized;
    }

    private static bool IsUniqueConstraintViolation(DbUpdateException exception) =>
        exception.InnerException is SqlException { Number: 2601 or 2627 };

    private async Task<IDbContextTransaction?> BeginSerializableTransactionIfSupportedAsync()
    {
        if (!dbContext.Database.IsRelational()) return null;

        return await dbContext.Database.BeginTransactionAsync(IsolationLevel.Serializable);
    }

    private async Task<Shuttle?> GetShuttleForUpdateAsync(int shuttleId)
    {
        if (!dbContext.Database.IsRelational())
            return await dbContext.Shuttles.SingleOrDefaultAsync(s => s.Id == shuttleId);

        return await dbContext.Shuttles
            .FromSqlInterpolated(
                $"""
                 SELECT * FROM [Shuttles] WITH (UPDLOCK, HOLDLOCK, ROWLOCK)
                 WHERE [Id] = {shuttleId}
                 """)
            .SingleOrDefaultAsync();
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
}