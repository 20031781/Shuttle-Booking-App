using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Data.Entities;

public class Shuttle
{
    public static readonly Shuttle Empty = new();
    
    public int Id { get; init; }
    
    [Required]
    [StringLength(100, MinimumLength = 1)]
    public string Name { get; init; } = string.Empty;
    
    [Range(1, 100)]
    public int Capacity { get; set; }

}