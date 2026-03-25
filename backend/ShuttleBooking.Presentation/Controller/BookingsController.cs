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
    [ProducesResponseType(typeof(BookingActionResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingActionResponse>> CreateBooking([FromBody] CreateBookingRequest request)
    {
        try
        {
            var result = await bookingService.CreateBookingAsync(request);
            return CreatedAtAction(nameof(GetUserHistory), new { email = request.UserEmail }, result);
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
    [ProducesResponseType(typeof(BookingActionResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<BookingActionResponse>> CancelBooking(int bookingId,
        [FromBody] CancelBookingRequest request)
    {
        try
        {
            var result = await bookingService.CancelBookingAsync(bookingId, request);
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
    [HttpGet("GetUserHistory/{email}")]
    [ProducesResponseType(typeof(IReadOnlyCollection<BookingDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<IReadOnlyCollection<BookingDto>>> GetUserHistory(string email)
    {
        try
        {
            var bookings = await bookingService.GetUserHistoryAsync(email);
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
    [ProducesResponseType(typeof(IReadOnlyCollection<ShuttleAvailabilityDto>), StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyCollection<ShuttleAvailabilityDto>>> GetShuttleAvailability(
        [FromQuery] DateTime? date = null)
    {
        var requestedDate = date?.Date ?? DateTime.UtcNow.Date;
        var availability = await bookingService.GetShuttleAvailabilityAsync(requestedDate);
        return Ok(availability);
    }

    private static ErrorResponse CreateError(string message, int statusCode) =>
        new()
        {
            Message = message,
            StatusCode = statusCode
        };
}