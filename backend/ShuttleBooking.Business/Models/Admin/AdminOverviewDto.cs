namespace ShuttleBooking.Business.Models.Admin;

public class AdminOverviewDto
{
    public required DateTime Date { get; init; }
    public required DateTime GeneratedAtUtc { get; init; }
    public int TotalUsers { get; init; }
    public int TotalShuttles { get; init; }
    public int BookingsCreated { get; init; }
    public int ActiveBookings { get; init; }
    public int CanceledBookings { get; init; }
    public int TotalCapacity { get; init; }
    public int SeatsAvailable { get; init; }
    public decimal OccupancyPercent { get; init; }
    public decimal CancellationRatePercent { get; init; }
    public IReadOnlyCollection<ShuttleOperationalDto> Shuttles { get; init; } = [];
}

public class ShuttleOperationalDto
{
    public int ShuttleId { get; init; }
    public string ShuttleName { get; init; } = string.Empty;
    public int Capacity { get; init; }
    public int ActiveBookings { get; init; }
    public int SeatsAvailable { get; init; }
    public decimal OccupancyPercent { get; init; }
}