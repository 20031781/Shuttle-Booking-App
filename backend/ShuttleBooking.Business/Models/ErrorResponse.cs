namespace ShuttleBooking.Business.Models;

public class ErrorResponse
{
    public required string Message { get; init; }
    public int StatusCode { get; init; }
    public string? ErrorCode { get; init; }
}
