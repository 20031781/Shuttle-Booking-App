using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using ShuttleBooking.Business.Models.Admin;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Data;

namespace ShuttleBooking.Business.Services;

public class AdminOpsService(
    AppDbContext dbContext,
    IOptions<PushNotificationsOptions> pushOptionsAccessor) : IAdminOpsService
{
    private readonly PushNotificationsOptions _pushOptions = pushOptionsAccessor.Value;

    public async Task<AdminOverviewDto> GetOverviewAsync(DateTime? date = null,
        CancellationToken cancellationToken = default)
    {
        var requestedDate = (date ?? DateTime.UtcNow).Date;
        var nextDay = requestedDate.AddDays(1);

        var totalUsers = await dbContext.Users.CountAsync(cancellationToken);
        var shuttles = await dbContext.Shuttles
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .Select(s => new { s.Id, s.Name, s.Capacity })
            .ToListAsync(cancellationToken);

        var bookingsForDay = await dbContext.Bookings
            .AsNoTracking()
            .Where(b => b.Date >= requestedDate && b.Date < nextDay)
            .Select(b => new { b.ShuttleId, b.IsCanceled })
            .ToListAsync(cancellationToken);

        var activeByShuttle = bookingsForDay
            .Where(b => !b.IsCanceled)
            .GroupBy(b => b.ShuttleId)
            .ToDictionary(group => group.Key, group => group.Count());

        var totalCapacity = shuttles.Sum(s => s.Capacity);
        var activeBookings = activeByShuttle.Values.Sum();
        var createdBookings = bookingsForDay.Count;
        var canceledBookings = bookingsForDay.Count(b => b.IsCanceled);
        var seatsAvailable = Math.Max(0, totalCapacity - activeBookings);
        var occupancyPercent = totalCapacity == 0
            ? 0m
            : Math.Round(activeBookings * 100m / totalCapacity, 2);
        var cancellationRatePercent = createdBookings == 0
            ? 0m
            : Math.Round(canceledBookings * 100m / createdBookings, 2);

        var shuttleDetails = shuttles.Select(shuttle =>
        {
            activeByShuttle.TryGetValue(shuttle.Id, out var activeCount);
            var seatsLeft = Math.Max(0, shuttle.Capacity - activeCount);
            var shuttleOccupancyPercent = shuttle.Capacity == 0
                ? 0m
                : Math.Round(activeCount * 100m / shuttle.Capacity, 2);

            return new ShuttleOperationalDto
            {
                ShuttleId = shuttle.Id,
                ShuttleName = shuttle.Name,
                Capacity = shuttle.Capacity,
                ActiveBookings = activeCount,
                SeatsAvailable = seatsLeft,
                OccupancyPercent = shuttleOccupancyPercent
            };
        }).ToList();

        return new AdminOverviewDto
        {
            Date = requestedDate,
            GeneratedAtUtc = DateTime.UtcNow,
            TotalUsers = totalUsers,
            TotalShuttles = shuttles.Count,
            BookingsCreated = createdBookings,
            ActiveBookings = activeBookings,
            CanceledBookings = canceledBookings,
            TotalCapacity = totalCapacity,
            SeatsAvailable = seatsAvailable,
            OccupancyPercent = occupancyPercent,
            CancellationRatePercent = cancellationRatePercent,
            Shuttles = shuttleDetails
        };
    }

    public async Task<AdminHealthDto> GetHealthAsync(CancellationToken cancellationToken = default)
    {
        var components = new List<AdminComponentStatusDto>
        {
            new()
            {
                Name = "api",
                Status = AdminHealthStatus.Healthy,
                Details = "API online"
            }
        };

        var dbStatus = await BuildDatabaseStatusAsync(cancellationToken);
        components.Add(dbStatus);

        var pushStatus = BuildPushStatus();
        components.Add(pushStatus);

        return new AdminHealthDto
        {
            CheckedAtUtc = DateTime.UtcNow,
            OverallStatus = ComputeOverallStatus(components),
            Components = components
        };
    }

    private async Task<AdminComponentStatusDto> BuildDatabaseStatusAsync(CancellationToken cancellationToken)
    {
        try
        {
            var canConnect = await dbContext.Database.CanConnectAsync(cancellationToken);
            return new AdminComponentStatusDto
            {
                Name = "database",
                Status = canConnect ? AdminHealthStatus.Healthy : AdminHealthStatus.Unhealthy,
                Details = canConnect ? "Connessione DB OK" : "Connessione DB fallita"
            };
        }
        catch (Exception ex)
        {
            return new AdminComponentStatusDto
            {
                Name = "database",
                Status = AdminHealthStatus.Unhealthy,
                Details = ex.Message
            };
        }
    }

    private AdminComponentStatusDto BuildPushStatus()
    {
        if (!_pushOptions.Enabled)
            return new AdminComponentStatusDto
            {
                Name = "push",
                Status = AdminHealthStatus.Disabled,
                Details = "Push disabilitate"
            };

        var hasProjectId = !string.IsNullOrWhiteSpace(_pushOptions.FirebaseProjectId);
        var hasServiceAccountJson = !string.IsNullOrWhiteSpace(_pushOptions.ServiceAccountJson);
        var hasServiceAccountPath = !string.IsNullOrWhiteSpace(_pushOptions.ServiceAccountPath) &&
                                    File.Exists(_pushOptions.ServiceAccountPath);

        if (!hasProjectId || (!hasServiceAccountJson && !hasServiceAccountPath))
            return new AdminComponentStatusDto
            {
                Name = "push",
                Status = AdminHealthStatus.Degraded,
                Details = "Configurazione Firebase incompleta"
            };

        return new AdminComponentStatusDto
        {
            Name = "push",
            Status = AdminHealthStatus.Healthy,
            Details = "Configurazione Firebase valida"
        };
    }

    private static AdminHealthStatus ComputeOverallStatus(IEnumerable<AdminComponentStatusDto> components)
    {
        var statuses = components.Select(component => component.Status).ToList();
        if (statuses.Contains(AdminHealthStatus.Unhealthy)) return AdminHealthStatus.Unhealthy;

        if (statuses.Contains(AdminHealthStatus.Degraded)) return AdminHealthStatus.Degraded;

        if (statuses.All(status => status == AdminHealthStatus.Disabled)) return AdminHealthStatus.Disabled;

        return AdminHealthStatus.Healthy;
    }
}