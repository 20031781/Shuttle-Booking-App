using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.Models.User;

public class SendTestPushRequest
{
    [MaxLength(120)] public string? Title { get; init; }
    [MaxLength(500)] public string? Body { get; init; }
    public Dictionary<string, string>? Data { get; init; }
}