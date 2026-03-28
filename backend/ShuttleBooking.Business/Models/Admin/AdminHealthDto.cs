namespace ShuttleBooking.Business.Models.Admin;

public enum AdminHealthStatus
{
    Healthy,
    Degraded,
    Unhealthy,
    Disabled
}

public class AdminHealthDto
{
    public required DateTime CheckedAtUtc { get; init; }
    public required AdminHealthStatus OverallStatus { get; init; }
    public IReadOnlyCollection<AdminComponentStatusDto> Components { get; init; } = [];
}

public class AdminComponentStatusDto
{
    public string Name { get; init; } = string.Empty;
    public AdminHealthStatus Status { get; init; }
    public string? Details { get; init; }
}