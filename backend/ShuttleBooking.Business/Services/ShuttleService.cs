using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Interfaces;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Business.Services;

public class ShuttleService(
    IShuttleRepository shuttleRepository
) : IShuttleService
{
    public async Task<IEnumerable<ShuttleDto>> GetAllShuttlesAsync()
    {
        var shuttles = await shuttleRepository.GetAllShuttlesAsync();
        return shuttles.Select(s => new ShuttleDto { Id = s.Id, Name = s.Name, Capacity = s.Capacity });
    }

    public async Task<ShuttleDto?> GetShuttleByIdAsync(int id)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        return shuttle == Shuttle.Empty
            ? null
            : new ShuttleDto { Id = shuttle.Id, Name = shuttle.Name, Capacity = shuttle.Capacity };
    }

    public async Task<ShuttleDto> CreateShuttleAsync(CreateShuttleDto createShuttleDto)
    {
        var shuttle = new Shuttle
        {
            Name = createShuttleDto.Name,
            Capacity = createShuttleDto.Capacity
        };

        var createdShuttle = await shuttleRepository.CreateShuttleAsync(shuttle);

        return new ShuttleDto
        {
            Id = createdShuttle.Id,
            Name = createdShuttle.Name,
            Capacity = createdShuttle.Capacity
        };
    }
    
    public async Task<ShuttleDto?> UpdateShuttleCapacityAsync(int id, int newCapacity)
    {
        var shuttle = await shuttleRepository.GetShuttleByIdAsync(id);
        
        if (shuttle == Shuttle.Empty)
        {
            return null;
        }

        shuttle.Capacity = newCapacity;

        var updatedShuttle = await shuttleRepository.UpdateShuttleAsync(shuttle);

        return new ShuttleDto
        {
            Id = updatedShuttle.Id,
            Name = updatedShuttle.Name,
            Capacity = updatedShuttle.Capacity
        };
    }
    
    public async Task<bool> DeleteShuttleAsync(int id)
    {
        return await shuttleRepository.DeleteShuttleAsync(id);
    }
}