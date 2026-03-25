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
        var requestedDate = date?.Date ?? DateTime.UtcNow.Date;
        var shuttles = await shuttleRepository.GetAllShuttlesAsync();
        var countsByShuttle = await bookingRepository.GetActiveBookingCountsByDateAsync(requestedDate);

        return shuttles.Select(shuttle =>
        {
            countsByShuttle.TryGetValue(shuttle.Id, out var activeCount);

            return new ShuttleDto
            {
                Id = shuttle.Id,
                Name = shuttle.Name,
                Capacity = shuttle.Capacity,
                AvailableSeats = Math.Max(0, shuttle.Capacity - activeCount)
            };
        });
    }

    public async Task<ShuttleDto?> GetShuttleByIdAsync(int id)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        if (shuttle == null) return null;

        var activeCount = await bookingRepository.GetActiveBookingCountAsync(shuttle.Id, DateTime.UtcNow.Date);

        return new ShuttleDto
        {
            Id = shuttle.Id,
            Name = shuttle.Name,
            Capacity = shuttle.Capacity,
            AvailableSeats = Math.Max(0, shuttle.Capacity - activeCount)
        };
    }

    public async Task<ShuttleDto> CreateShuttleAsync(CreateShuttleDto createShuttleDto)
    {
        var shuttle = new Shuttle
        {
            Name = createShuttleDto.Name.Trim(),
            Capacity = createShuttleDto.Capacity
        };

        var createdShuttle = await shuttleRepository.CreateShuttleAsync(shuttle);

        return new ShuttleDto
        {
            Id = createdShuttle.Id,
            Name = createdShuttle.Name,
            Capacity = createdShuttle.Capacity,
            AvailableSeats = createdShuttle.Capacity
        };
    }

    public async Task<ShuttleDto?> UpdateShuttleCapacityAsync(int id, int newCapacity)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        if (shuttle == null) return null;

        shuttle.Capacity = newCapacity;

        var updatedShuttle = await shuttleRepository.UpdateShuttleAsync(shuttle);
        var activeCount = await bookingRepository.GetActiveBookingCountAsync(updatedShuttle.Id, DateTime.UtcNow.Date);

        return new ShuttleDto
        {
            Id = updatedShuttle.Id,
            Name = updatedShuttle.Name,
            Capacity = updatedShuttle.Capacity,
            AvailableSeats = Math.Max(0, updatedShuttle.Capacity - activeCount)
        };
    }

    public async Task<bool> DeleteShuttleAsync(int id) => await shuttleRepository.DeleteShuttleAsync(id);
}