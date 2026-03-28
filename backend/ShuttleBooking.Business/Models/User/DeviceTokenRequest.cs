using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class DeviceTokenRequest
{
    [Required] [MaxLength(256)] public required string Token { get; init; }

    [Required] [MaxLength(16)] public required string Platform { get; init; }
}