using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Data.Entities;

public class Shuttle
{
    public int Id { get; set; }

    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; set; } = string.Empty;

    [Range(1, 100)]
    public int Capacity { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}