using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using ShuttleBooking.Business.DTOs;
using ShuttleBooking.Business.Models.User;

namespace ShuttleBooking.Tests;

public class BookingsControllerTests(CustomWebApplicationFactory factory) : IClassFixture<CustomWebApplicationFactory>
{
    private readonly HttpClient _client = factory.CreateClient();

    [Fact]
    public async Task CreateBooking_ReturnsCreated_AndUpdatesAvailability()
    {
        var userEmail = $"utente.booking.{Guid.NewGuid():N}@test.it";
        var bookingDate = DateTime.UtcNow.Date.AddDays(1);

        await EnsureUserExistsAsync(userEmail);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 1", 1);

        var createBookingResponse = await _client.PostAsJsonAsync("/Bookings/CreateBooking", new CreateBookingRequest
        {
            UserEmail = userEmail,
            ShuttleId = shuttle.Id,
            Date = bookingDate
        });

        createBookingResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var bookingResult = await createBookingResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        bookingResult.Should().NotBeNull();
        bookingResult!.SeatsRemaining.Should().Be(0);
        bookingResult.Booking.IsCanceled.Should().BeFalse();

        var shuttlesResponse =
            await _client.GetFromJsonAsync<List<ShuttleDto>>($"/Shuttles/GetShuttles?date={bookingDate:O}");
        shuttlesResponse.Should().NotBeNull();
        var updatedShuttle = shuttlesResponse!.Single(s => s.Id == shuttle.Id);
        updatedShuttle.AvailableSeats.Should().Be(0);
    }

    [Fact]
    public async Task CreateBooking_ReturnsConflict_WhenUserHasActiveBookingForSameShuttleAndDate()
    {
        var userEmail = $"utente.duplicate.{Guid.NewGuid():N}@test.it";
        var bookingDate = DateTime.UtcNow.Date.AddDays(2);

        await EnsureUserExistsAsync(userEmail);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 2", 3);

        var firstCreate = await _client.PostAsJsonAsync("/Bookings/CreateBooking", new CreateBookingRequest
        {
            UserEmail = userEmail,
            ShuttleId = shuttle.Id,
            Date = bookingDate
        });
        firstCreate.StatusCode.Should().Be(HttpStatusCode.Created);

        var secondCreate = await _client.PostAsJsonAsync("/Bookings/CreateBooking", new CreateBookingRequest
        {
            UserEmail = userEmail,
            ShuttleId = shuttle.Id,
            Date = bookingDate
        });

        secondCreate.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CancelBooking_ReturnsOk_AndMovesBookingToHistory()
    {
        var userEmail = $"utente.cancel.{Guid.NewGuid():N}@test.it";
        var bookingDate = DateTime.UtcNow.Date.AddDays(3);

        await EnsureUserExistsAsync(userEmail);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 3", 2);

        var createBookingResponse = await _client.PostAsJsonAsync("/Bookings/CreateBooking", new CreateBookingRequest
        {
            UserEmail = userEmail,
            ShuttleId = shuttle.Id,
            Date = bookingDate
        });
        createBookingResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdBooking = await createBookingResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        createdBooking.Should().NotBeNull();

        var cancelResponse = await _client.PutAsJsonAsync(
            $"/Bookings/CancelBooking/{createdBooking!.Booking.Id}",
            new CancelBookingRequest { UserEmail = userEmail });

        cancelResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var canceledBooking = await cancelResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        canceledBooking.Should().NotBeNull();
        canceledBooking!.Booking.IsCanceled.Should().BeTrue();
        canceledBooking.SeatsRemaining.Should().Be(2);

        var historyResponse = await _client.GetFromJsonAsync<List<BookingDto>>($"/Bookings/GetUserHistory/{userEmail}");
        historyResponse.Should().NotBeNull();
        historyResponse!.Should().ContainSingle(b => b.Id == createdBooking.Booking.Id && b.IsCanceled);
    }

    private async Task EnsureUserExistsAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/User/register", new RegisterUserRequest
        {
            Email = email,
            FirstName = "Utente",
            LastName = "Test",
            AuthProvider = "App",
            PhoneCountryCode = "+39",
            City = "Roma"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private async Task<ShuttleDto> CreateShuttleAsync(string name, int capacity)
    {
        var response = await _client.PostAsJsonAsync("/Shuttles/CreateShuttle", new CreateShuttleDto
        {
            Name = name,
            Capacity = capacity
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var shuttle = await response.Content.ReadFromJsonAsync<ShuttleDto>();
        shuttle.Should().NotBeNull();
        return shuttle!;
    }
}