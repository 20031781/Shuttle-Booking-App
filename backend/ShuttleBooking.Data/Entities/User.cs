using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace ShuttleBooking.Data.Entities;

[Index(nameof(Email), IsUnique = true)]
public class User
{
    [Key]
    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
    public int Id { get; set; }

    [Required] [MaxLength(100)] public required string Email { get; set; }

    [Required] [MaxLength(50)] public required string FirstName { get; set; }

    [Required] [MaxLength(50)] public required string LastName { get; set; }

    [Required] [MaxLength(20)] public required string AuthProvider { get; set; }

    [Required] public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(255)] public string? ProfilePicture { get; set; }

    [MaxLength(20)] public string? Phone { get; set; }

    [Required] [MaxLength(5)] public required string PhoneCountryCode { get; set; }

    [MaxLength(255)] public string? Address { get; set; }

    [Required] [MaxLength(100)] public required string City { get; set; }

    public ICollection<Booking> Bookings { get; set; } = new List<Booking>();
}