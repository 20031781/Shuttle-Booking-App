namespace ShuttleBookingApp.Business.Models;

public class User
{
    public int Id { get; set; }
    public required string FirstName { get; init; }
    public required string LastName { get; init; }
    public string Address { get; set; } = string.Empty;
    public required string Email { get; init; }
    public string Password { get; init; } = string.Empty; // Usata solo per il binding, non deve mai essere salvata.
    public required string Phone { get; set; }
    public required string PhoneCountryCode { get; set; }
    public required string City { get; set; }
    public string AuthProvider { get; init; } = "Standard"; // "Google", "Apple", "Facebook", ecc.
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public string? ProfilePicture { get; set; } // URL dell'immagine del profilo
}