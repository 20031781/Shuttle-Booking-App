namespace ShuttleBooking.Data.Entities;

public class Booking
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int ShuttleId { get; set; }
    public DateTime Date { get; set; }
}