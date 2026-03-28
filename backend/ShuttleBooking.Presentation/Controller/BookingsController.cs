using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Controller per gestire prenotazioni e disponibilità shuttle.
/// </summary>
[ApiController]
[Route("[controller]")]
public class BookingsController(IBookingService bookingService) : ControllerBase
{
    /// <summary>
    ///     Crea una nuova prenotazione.
    /// </summary>
    [HttpPost("CreateBooking")]
    [Authorize]
    [ProducesResponseType(typeof(BookingActionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(BookingActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingActionResponse>> CreateBooking([FromBody] CreateBookingRequest request)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(CreateError("Token utente non valido.", StatusCodes.Status401Unauthorized));

        var idempotencyKey = HttpContext.Request.Headers["X-Idempotency-Key"].FirstOrDefault();

        try
        {
            var result = await bookingService.CreateBookingAsync(userId, request, idempotencyKey);
            if (result.IsIdempotentReplay) return Ok(result);

            return CreatedAtAction(nameof(GetUserHistory), null, result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(CreateError(ex.Message, StatusCodes.Status401Unauthorized));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(CreateError(ex.Message, StatusCodes.Status404NotFound));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(CreateError(ex.Message, StatusCodes.Status409Conflict));
        }
    }

    /// <summary>
    ///     Annulla una prenotazione esistente.
    /// </summary>
    [HttpPut("CancelBooking/{bookingId:int}")]
    [Authorize]
    [ProducesResponseType(typeof(BookingActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingActionResponse>> CancelBooking(int bookingId)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(CreateError("Token utente non valido.", StatusCodes.Status401Unauthorized));

        try
        {
            var result = await bookingService.CancelBookingAsync(userId, bookingId);
            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(CreateError(ex.Message, StatusCodes.Status401Unauthorized));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(CreateError(ex.Message, StatusCodes.Status404NotFound));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(CreateError(ex.Message, StatusCodes.Status409Conflict));
        }
    }

    /// <summary>
    ///     Ottiene lo storico prenotazioni di un utente.
    /// </summary>
    [HttpGet("GetUserHistory")]
    [Authorize]
    [ProducesResponseType(typeof(IReadOnlyCollection<BookingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<BookingDto>>> GetUserHistory()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(CreateError("Token utente non valido.", StatusCodes.Status401Unauthorized));

        try
        {
            var bookings = await bookingService.GetUserHistoryAsync(userId);
            return Ok(bookings);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(CreateError(ex.Message, StatusCodes.Status404NotFound));
        }
    }

    /// <summary>
    ///     Ottiene i posti disponibili per ogni shuttle nella data indicata.
    /// </summary>
    [HttpGet("GetShuttleAvailability")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IReadOnlyCollection<ShuttleAvailabilityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<ShuttleAvailabilityDto>>> GetShuttleAvailability(
        [FromQuery] DateTime? date = null)
    {
        var requestedDate = date?.Date ?? DateTime.UtcNow.Date;
        var availability = await bookingService.GetShuttleAvailabilityAsync(requestedDate);
        return Ok(availability);
    }

    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var rawUserId = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawUserId, out userId);
    }

    private static ErrorResponse CreateError(string message, int statusCode) =>
        new()
        {
            Message = message,
            StatusCode = statusCode
        };
}