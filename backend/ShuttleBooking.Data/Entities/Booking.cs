using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Data.Entities;

public class Booking
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ShuttleId { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public bool IsCanceled { get; set; }
    public DateTime? CanceledAt { get; set; }
    [MaxLength(80)] public string? IdempotencyKey { get; set; }
    [Timestamp] public byte[] RowVersion { get; set; } = [];

    public User? User { get; set; }
    public Shuttle? Shuttle { get; set; }
}