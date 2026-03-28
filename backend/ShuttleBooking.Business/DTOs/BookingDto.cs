using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.DTOs;

public class BookingDto
{
    public int Id { get; init; }
    public int UserId { get; init; }
    public string UserEmail { get; init; } = string.Empty;
    public int ShuttleId { get; init; }
    public string ShuttleName { get; init; } = string.Empty;
    public DateTime Date { get; init; }
    public DateTime CreatedAt { get; init; }
    public bool IsCanceled { get; init; }
    public DateTime? CanceledAt { get; init; }
}

public class CreateBookingRequest
{
    [Range(1, int.MaxValue)]
    public int ShuttleId { get; init; }

    [Required]
    public DateTime Date { get; init; }
}

public class BookingActionResponse
{
    public required BookingDto Booking { get; init; }
    public int SeatsRemaining { get; init; }
    public bool IsIdempotentReplay { get; init; }
}

public class ShuttleAvailabilityDto
{
    public int ShuttleId { get; init; }
    public int SeatsAvailable { get; init; }
    public DateTime Date { get; init; }
}