namespace ShuttleBookingApp.Business.Models;

/// <summary>
///     Entità "<b>Shuttle</b>", anche chiamata "navetta".
/// </summary>
public class Shuttle
{
    public int Id { get; set; }
    public required string Name { get; set; }
    public int Capacity { get; set; }
}