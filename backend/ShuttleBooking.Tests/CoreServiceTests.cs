using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Moq;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Tests;

public class CoreServiceTests
{
    [Fact]
    public void PasswordHashing_HashesAndVerifiesOnlyTheOriginalPassword()
    {
        var hash = PasswordHashing.HashPassword("password-123");

        hash.Should().NotBe("password-123");
        PasswordHashing.VerifyPassword("password-123", hash).Should().BeTrue();
        PasswordHashing.VerifyPassword("wrong-password", hash).Should().BeFalse();
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid")]
    [InlineData("100000.invalid-base64.hash")]
    public void PasswordHashing_RejectsMalformedHashes(string storedHash)
    {
        PasswordHashing.VerifyPassword("password-123", storedHash).Should().BeFalse();
    }

    [Fact]
    public void JwtService_GeneratesSignedTokenWithIdentityAndRoles()
    {
        var service = new JwtService(CreateConfiguration(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-signing-key-that-is-long-enough-123456789",
            ["Jwt:Issuer"] = "test-issuer",
            ["Jwt:Audience"] = "test-audience"
        }));
        var user = new User
        {
            Id = 7,
            Email = "user@test.it",
            FirstName = "Mario",
            LastName = "Rossi",
            AuthProvider = "Google",
            PhoneCountryCode = "+39",
            City = "Roma"
        };

        var token = service.GenerateToken(user, ["Manager"], DateTime.UtcNow.AddMinutes(10));
        var jwt = new JwtSecurityTokenHandler().ReadJwtToken(token);

        jwt.Claims.Should().Contain(claim => claim.Type == JwtRegisteredClaimNames.Email && claim.Value == user.Email);
        jwt.Claims.Should().Contain(claim => claim.Type == JwtRegisteredClaimNames.Sub && claim.Value == "7");
        jwt.Claims.Should().Contain(claim => claim.Value == "Manager"
                                             && (claim.Type == "role" || claim.Type == ClaimTypes.Role));
        jwt.Issuer.Should().Be("test-issuer");
        jwt.Audiences.Should().Contain("test-audience");
    }

    [Fact]
    public void JwtService_ProvidesRandomRefreshTokenAndDeterministicHash()
    {
        var service = new JwtService(CreateConfiguration(new Dictionary<string, string?>
        {
            ["Jwt:Key"] = "test-signing-key-that-is-long-enough-123456789"
        }));

        var refreshToken = service.GenerateRefreshToken();

        Convert.FromBase64String(refreshToken).Should().HaveCount(64);
        service.HashRefreshToken(refreshToken).Should().Be(service.HashRefreshToken(refreshToken));
        service.HashRefreshToken(refreshToken).Should().NotBe(refreshToken);
    }

    [Fact]
    public void GoogleAudienceConfiguration_MergesAndDeduplicatesAllSupportedFormats()
    {
        var configuration = CreateConfiguration(new Dictionary<string, string?>
        {
            ["GoogleAuth:ClientId"] = "client-a, client-b",
            ["GoogleAuth:ClientIds:0"] = "client-b",
            ["GoogleAuth:ClientIds:1"] = "client-c",
            ["GoogleAuth:WebClientId"] = "client-d",
            ["GoogleAuth:AndroidClientId"] = "client-a"
        });

        GoogleAudienceConfiguration.GetAudiences(configuration)
            .Should().BeEquivalentTo("client-a", "client-b", "client-c", "client-d");
    }

    [Fact]
    public async Task ShuttleService_MapsActiveBookingsForTheRequestedDate()
    {
        var meetingAtUtc = new DateTime(2026, 8, 1, 7, 30, 0, DateTimeKind.Utc);
        var shuttleRepository = new Mock<IShuttleRepository>();
        var bookingRepository = new Mock<IBookingRepository>();
        shuttleRepository.Setup(repository => repository.GetAllShuttlesAsync())
            .ReturnsAsync([new Shuttle { Id = 1, Name = "Navetta", Capacity = 10, MeetingAtUtc = meetingAtUtc }]);
        bookingRepository.Setup(repository => repository.GetActiveBookingCountsAsync(It.IsAny<IReadOnlyCollection<int>>()))
            .ReturnsAsync(new Dictionary<(int ShuttleId, DateTime Date), int>
            {
                [(1, meetingAtUtc.Date)] = 3
            });

        var result = await new ShuttleService(shuttleRepository.Object, bookingRepository.Object)
            .GetAllShuttlesAsync();

        result.Should().ContainSingle().Which.Should().Match<ShuttleDto>(shuttle =>
            shuttle.Id == 1 && shuttle.AvailableSeats == 7 && shuttle.MeetingAtUtc == meetingAtUtc);
    }

    [Fact]
    public async Task ShuttleService_CreatesAndUpdatesWithNormalizedValues()
    {
        var shuttleRepository = new Mock<IShuttleRepository>();
        var bookingRepository = new Mock<IBookingRepository>();
        shuttleRepository.Setup(repository => repository.CreateShuttleAsync(It.IsAny<Shuttle>()))
            .ReturnsAsync((Shuttle shuttle) =>
            {
                shuttle.Id = 3;
                return shuttle;
            });
        shuttleRepository.Setup(repository => repository.GetShuttleByIdAsync(3))
            .ReturnsAsync(new Shuttle
            {
                Id = 3,
                Name = "Old",
                Capacity = 8,
                MeetingAtUtc = new DateTime(2026, 8, 1, 7, 0, 0, DateTimeKind.Utc)
            });
        shuttleRepository.Setup(repository => repository.UpdateShuttleAsync(It.IsAny<Shuttle>()))
            .ReturnsAsync((Shuttle shuttle) => shuttle);
        bookingRepository.Setup(repository => repository.GetActiveBookingCountAsync(3, It.IsAny<DateTime>()))
            .ReturnsAsync(2);
        var service = new ShuttleService(shuttleRepository.Object, bookingRepository.Object);

        var created = await service.CreateShuttleAsync(new CreateShuttleDto
        {
            Name = "  Nuova navetta  ",
            Capacity = 10,
            MeetingAtUtc = new DateTime(2026, 8, 1, 8, 0, 0, DateTimeKind.Unspecified)
        });
        var updated = await service.UpdateShuttleDetailsAsync(
            3,
            "  Navetta aggiornata  ",
            12,
            new DateTime(2026, 8, 1, 9, 0, 0, DateTimeKind.Unspecified));

        created.Name.Should().Be("Nuova navetta");
        created.MeetingAtUtc.Kind.Should().Be(DateTimeKind.Utc);
        updated.Should().Match<ShuttleDto>(shuttle =>
            shuttle.Name == "Navetta aggiornata" && shuttle.Capacity == 12 && shuttle.AvailableSeats == 10);
    }

    [Fact]
    public async Task ShuttleService_ReturnsNullForMissingShuttleAndDelegatesDelete()
    {
        var shuttleRepository = new Mock<IShuttleRepository>();
        var bookingRepository = new Mock<IBookingRepository>();
        shuttleRepository.Setup(repository => repository.GetShuttleByIdAsync(404))
            .ReturnsAsync((Shuttle?)null);
        shuttleRepository.Setup(repository => repository.DeleteShuttleAsync(4)).ReturnsAsync(true);
        var service = new ShuttleService(shuttleRepository.Object, bookingRepository.Object);

        (await service.GetShuttleByIdAsync(404)).Should().BeNull();
        (await service.UpdateShuttleDetailsAsync(404, "Missing", 1, DateTime.UtcNow)).Should().BeNull();
        (await service.DeleteShuttleAsync(4)).Should().BeTrue();
    }

    private static IConfiguration CreateConfiguration(Dictionary<string, string?> values) =>
        new ConfigurationBuilder().AddInMemoryCollection(values).Build();
}
