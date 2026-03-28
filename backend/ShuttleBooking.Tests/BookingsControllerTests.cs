using System.Net;
using System.Net.Http.Headers;
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
        var token = await AuthenticateAsync(userEmail);
        var bookingDate = DateTime.UtcNow.Date.AddDays(1);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 1", 1);

        var createBookingResponse = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token);

        createBookingResponse.StatusCode.Should().Be(HttpStatusCode.Created);
        var bookingResult = await createBookingResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        bookingResult.Should().NotBeNull();
        bookingResult!.SeatsRemaining.Should().Be(0);
        bookingResult.Booking.IsCanceled.Should().BeFalse();
        bookingResult.IsIdempotentReplay.Should().BeFalse();

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
        var token = await AuthenticateAsync(userEmail);
        var bookingDate = DateTime.UtcNow.Date.AddDays(2);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 2", 3);

        var firstCreate = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token);
        firstCreate.StatusCode.Should().Be(HttpStatusCode.Created);

        var secondCreate = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token);

        secondCreate.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task CancelBooking_ReturnsOk_AndMovesBookingToHistory()
    {
        var userEmail = $"utente.cancel.{Guid.NewGuid():N}@test.it";
        var token = await AuthenticateAsync(userEmail);
        var bookingDate = DateTime.UtcNow.Date.AddDays(3);
        var shuttle = await CreateShuttleAsync("Shuttle Prenotazione 3", 2);

        var createBookingResponse = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token);
        createBookingResponse.StatusCode.Should().Be(HttpStatusCode.Created);

        var createdBooking = await createBookingResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        createdBooking.Should().NotBeNull();

        var cancelResponse = await SendAuthorizedJsonAsync<object?>(
            HttpMethod.Put,
            $"/Bookings/CancelBooking/{createdBooking!.Booking.Id}",
            null,
            token);

        cancelResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var canceledBooking = await cancelResponse.Content.ReadFromJsonAsync<BookingActionResponse>();
        canceledBooking.Should().NotBeNull();
        canceledBooking!.Booking.IsCanceled.Should().BeTrue();
        canceledBooking.SeatsRemaining.Should().Be(2);

        var historyResponse = await SendAuthorizedJsonAsync<object?>(
            HttpMethod.Get,
            "/Bookings/GetUserHistory",
            null,
            token);
        historyResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var history = await historyResponse.Content.ReadFromJsonAsync<List<BookingDto>>();
        history.Should().NotBeNull();
        history!.Should().ContainSingle(b => b.Id == createdBooking.Booking.Id && b.IsCanceled);
    }

    [Fact]
    public async Task CreateBooking_IsIdempotent_WhenUsingSameHeaderKey()
    {
        var userEmail = $"utente.idempotent.{Guid.NewGuid():N}@test.it";
        var token = await AuthenticateAsync(userEmail);
        var bookingDate = DateTime.UtcNow.Date.AddDays(4);
        var shuttle = await CreateShuttleAsync("Shuttle Idempotente", 3);
        var idempotencyKey = Guid.NewGuid().ToString("N");

        var first = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token,
            idempotencyKey);

        var second = await SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token,
            idempotencyKey);

        first.StatusCode.Should().Be(HttpStatusCode.Created);
        second.StatusCode.Should().Be(HttpStatusCode.OK);

        var firstPayload = await first.Content.ReadFromJsonAsync<BookingActionResponse>();
        var secondPayload = await second.Content.ReadFromJsonAsync<BookingActionResponse>();
        firstPayload.Should().NotBeNull();
        secondPayload.Should().NotBeNull();
        secondPayload!.IsIdempotentReplay.Should().BeTrue();
        secondPayload.Booking.Id.Should().Be(firstPayload!.Booking.Id);
    }

    [Fact]
    public async Task CreateBooking_DoesNotOverbook_WhenRequestsAreConcurrent()
    {
        const int users = 5;
        var bookingDate = DateTime.UtcNow.Date.AddDays(5);
        var shuttle = await CreateShuttleAsync("Shuttle Concorrenza", 1);

        var tokens = new List<string>();
        for (var i = 0; i < users; i++)
        {
            var email = $"utente.concurrent.{i}.{Guid.NewGuid():N}@test.it";
            tokens.Add(await AuthenticateAsync(email));
        }

        var tasks = tokens.Select(token => SendAuthorizedJsonAsync(
            HttpMethod.Post,
            "/Bookings/CreateBooking",
            new CreateBookingRequest
            {
                ShuttleId = shuttle.Id,
                Date = bookingDate
            },
            token));

        var responses = await Task.WhenAll(tasks);

        responses.Count(response => response.StatusCode == HttpStatusCode.Created).Should().Be(1);
        responses.Count(response => response.StatusCode == HttpStatusCode.Conflict).Should().Be(users - 1);

        var availability =
            await _client.GetFromJsonAsync<List<ShuttleDto>>($"/Shuttles/GetShuttles?date={bookingDate:O}");
        availability.Should().NotBeNull();
        availability!.Single(item => item.Id == shuttle.Id).AvailableSeats.Should().Be(0);
    }

    private async Task<string> AuthenticateAsync(string email)
    {
        await EnsureUserExistsAsync(email);

        var loginResponse = await _client.PostAsJsonAsync("/User/LoginWithGoogle", new GoogleLoginRequest
        {
            Email = email,
            GoogleToken = "valid-token"
        });

        loginResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payload = await loginResponse.Content.ReadFromJsonAsync<LoginResponse>();
        payload.Should().NotBeNull();
        return payload!.Token;
    }

    private async Task<HttpResponseMessage> SendAuthorizedJsonAsync<TBody>(
        HttpMethod method,
        string path,
        TBody? body,
        string accessToken,
        string? idempotencyKey = null)
    {
        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        if (!string.IsNullOrWhiteSpace(idempotencyKey)) request.Headers.Add("X-Idempotency-Key", idempotencyKey);

        if (body is not null) request.Content = JsonContent.Create(body);

        return await _client.SendAsync(request);
    }

    private async Task EnsureUserExistsAsync(string email)
    {
        var response = await _client.PostAsJsonAsync("/User/register", new RegisterUserRequest
        {
            Email = email,
            FirstName = "Utente",
            LastName = "Test",
            AuthProvider = "Google",
            PhoneCountryCode = "+39",
            City = "Roma"
        });

        response.StatusCode.Should().BeOneOf(HttpStatusCode.Created, HttpStatusCode.Conflict);
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