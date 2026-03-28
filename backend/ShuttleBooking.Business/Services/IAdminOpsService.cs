using ShuttleBooking.Business.Models.Admin;

namespace ShuttleBooking.Business.Services;

public interface IAdminOpsService
{
    Task<AdminOverviewDto> GetOverviewAsync(DateTime? date = null, CancellationToken cancellationToken = default);
    Task<AdminHealthDto> GetHealthAsync(CancellationToken cancellationToken = default);
}