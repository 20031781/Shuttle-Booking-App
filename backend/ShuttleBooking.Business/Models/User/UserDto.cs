namespace ShuttleBooking.Business.Models.User;

public class UserDto
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string FirstName { get; set; }
    public required string LastName { get; set; }
    public required string AuthProvider { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? ProfilePicture { get; set; }
    public string? Phone { get; set; }
    public required string PhoneCountryCode { get; set; }
    public string? Address { get; set; }
    public required string City { get; set; }
}