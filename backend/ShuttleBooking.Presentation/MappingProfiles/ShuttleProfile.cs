using AutoMapper;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Data.Entities;

namespace ShuttleBooking.Presentation.MappingProfiles;

/// <summary>
///     Profilo di mappatura per la classe Shuttle.
/// </summary>
public class ShuttleProfile : Profile
{
    /// <summary>
    ///     Inizializza una nuova istanza della classe <see cref="ShuttleProfile" />.
    ///     Configura le mappe tra <see cref="Shuttle" /> e <see cref="ShuttleDto" />.
    /// </summary>
    public ShuttleProfile()
    {
        CreateMap<Shuttle, ShuttleDto>()
            .ForMember(destination => destination.AvailableSeats,
                options => options.MapFrom(source => source.Capacity));
        CreateMap<ShuttleDto, Shuttle>()
            .ForMember(destination => destination.Bookings, options => options.Ignore())
            .ForMember(destination => destination.RowVersion, options => options.Ignore());
    }
}