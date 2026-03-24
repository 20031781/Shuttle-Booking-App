using Microsoft.EntityFrameworkCore;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Data.Interfaces;

public class ShuttleRepository(AppDbContext context) : IShuttleRepository
{
    public async Task<IEnumerable<Shuttle>> GetAllShuttlesAsync() =>
        await context.Shuttles
            .AsNoTracking()
            .OrderBy(s => s.Name)
            .ToListAsync();

    public async Task<Shuttle?> GetShuttleByIdAsync(int id) =>
        await context.Shuttles.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);

    public async Task<Shuttle> CreateShuttleAsync(Shuttle shuttle)
    {
        context.Shuttles.Add(shuttle);
        await context.SaveChangesAsync();
        return shuttle;
    }

    public async Task<Shuttle> UpdateShuttleAsync(Shuttle shuttle)
    {
        context.Entry(shuttle).State = EntityState.Modified;
        await context.SaveChangesAsync();
        return shuttle;
    }

    public async Task<bool> DeleteShuttleAsync(int id)
    {
        var shuttle = await context.Shuttles.FindAsync(id);
        if (shuttle == null) return false;

        context.Shuttles.Remove(shuttle);
        await context.SaveChangesAsync();
        return true;
    }
}