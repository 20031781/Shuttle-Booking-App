using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class ShuttleService(
    IShuttleRepository shuttleRepository,
    IBookingRepository bookingRepository) : IShuttleService
{
    public async Task<IEnumerable<ShuttleDto>> GetAllShuttlesAsync(DateTime? date = null)
    {
        var requestedDate = date?.Date;
        var shuttles = (await shuttleRepository.GetAllShuttlesAsync()).ToList();
        var result = new List<ShuttleDto>(shuttles.Count);

        foreach (var shuttle in shuttles)
        {
            var bookingDate = requestedDate ?? shuttle.MeetingAtUtc.Date;
            var activeCount = await bookingRepository.GetActiveBookingCountAsync(shuttle.Id, bookingDate);
            result.Add(MapShuttle(shuttle, activeCount));
        }

        return result;
    }

    public async Task<ShuttleDto?> GetShuttleByIdAsync(int id)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        if (shuttle == null) return null;

        var activeCount = await bookingRepository.GetActiveBookingCountAsync(shuttle.Id, shuttle.MeetingAtUtc.Date);

        return MapShuttle(shuttle, activeCount);
    }

    public async Task<ShuttleDto> CreateShuttleAsync(CreateShuttleDto createShuttleDto)
    {
        var shuttle = new Shuttle
        {
            Name = createShuttleDto.Name.Trim(),
            Capacity = createShuttleDto.Capacity,
            MeetingAtUtc = NormalizeMeetingAtUtc(createShuttleDto.MeetingAtUtc)
        };

        var createdShuttle = await shuttleRepository.CreateShuttleAsync(shuttle);
        return MapShuttle(createdShuttle, 0);
    }

    public async Task<ShuttleDto?> UpdateShuttleDetailsAsync(int id, string name, int capacity, DateTime meetingAtUtc)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        if (shuttle == null) return null;

        shuttle.Name = name.Trim();
        shuttle.Capacity = capacity;
        shuttle.MeetingAtUtc = NormalizeMeetingAtUtc(meetingAtUtc);

        var updatedShuttle = await shuttleRepository.UpdateShuttleAsync(shuttle);
        var activeCount = await bookingRepository.GetActiveBookingCountAsync(
            updatedShuttle.Id,
            updatedShuttle.MeetingAtUtc.Date);

        return MapShuttle(updatedShuttle, activeCount);
    }

    public async Task<bool> DeleteShuttleAsync(int id) => await shuttleRepository.DeleteShuttleAsync(id);

    private static DateTime NormalizeMeetingAtUtc(DateTime meetingAtUtc)
    {
        if (meetingAtUtc == default) return DateTime.UtcNow;

        return meetingAtUtc.Kind switch
        {
            DateTimeKind.Utc => meetingAtUtc,
            DateTimeKind.Local => meetingAtUtc.ToUniversalTime(),
            _ => DateTime.SpecifyKind(meetingAtUtc, DateTimeKind.Utc)
        };
    }

    private static ShuttleDto MapShuttle(Shuttle shuttle, int activeCount) =>
        new()
        {
            Id = shuttle.Id,
            Name = shuttle.Name,
            Capacity = shuttle.Capacity,
            AvailableSeats = Math.Max(0, shuttle.Capacity - activeCount),
            MeetingAtUtc = shuttle.MeetingAtUtc
        };
}