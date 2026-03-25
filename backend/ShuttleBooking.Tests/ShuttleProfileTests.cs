using AutoMapper;
using Microsoft.Extensions.Logging.Abstractions;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Presentation.MappingProfiles;

namespace ShuttleBooking.Tests;

public class ShuttleProfileTests
{
    private readonly IMapper _mapper;

    public ShuttleProfileTests()
    {
        var config = new MapperConfiguration(cfg => { cfg.AddProfile<ShuttleProfile>(); }, NullLoggerFactory.Instance);

        _mapper = config.CreateMapper();
    }

    [Fact]
    public void Map_ShuttleToShuttleDto_ShouldHaveValidConfiguration() =>
        // Act
        _mapper.ConfigurationProvider.AssertConfigurationIsValid();

    [Fact]
    public void Map_ShuttleToShuttleDto_ShouldMapCorrectly()
    {
        // Arrange
        var shuttle = new Shuttle
        {
            Id = 1,
            Name = "Test Shuttle",
            Capacity = 50
        };

        // Act
        var shuttleDto = _mapper.Map<ShuttleDto>(shuttle);

        // Assert
        Assert.NotNull(shuttleDto);
        Assert.Equal(shuttle.Id, shuttleDto.Id);
        Assert.Equal(shuttle.Name, shuttleDto.Name);
        Assert.Equal(shuttle.Capacity, shuttleDto.Capacity);
        Assert.Equal(shuttle.Capacity, shuttleDto.AvailableSeats);
    }

    [Fact]
    public void Map_ShuttleDtoToShuttle_ShouldMapCorrectly()
    {
        // Arrange
        var shuttleDto = new ShuttleDto
        {
            Id = 1,
            Name = "Test Shuttle",
            Capacity = 50,
            AvailableSeats = 35
        };

        // Act
        var shuttle = _mapper.Map<Shuttle>(shuttleDto);

        // Assert
        Assert.NotNull(shuttle);
        Assert.Equal(shuttleDto.Id, shuttle.Id);
        Assert.Equal(shuttleDto.Name, shuttle.Name);
        Assert.Equal(shuttleDto.Capacity, shuttle.Capacity);
    }
}