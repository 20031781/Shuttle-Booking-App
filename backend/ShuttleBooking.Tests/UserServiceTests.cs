using FluentAssertions;
using Moq;
using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Business.Services;
using ShuttleBooking.Data.Entities;
using ShuttleBooking.Data.Interfaces;

namespace ShuttleBooking.Tests;

public class UserServiceTests
{
    private readonly Mock<IGoogleAuthService> _googleAuthServiceMock = new();
    private readonly Mock<IJwtService> _jwtServiceMock = new();
    private readonly Mock<IUserRepository> _userRepositoryMock = new();

    [Fact]
    public async Task RegisterUserAsync_Throws_WhenEmailAlreadyExists()
    {
        _userRepositoryMock
            .Setup(repository => repository.ExistsByEmailAsync("utente@test.it"))
            .ReturnsAsync(true);

        var userService = CreateService();

        var action = async () => await userService.RegisterUserAsync(new RegisterUserRequest
        {
            Email = "utente@test.it",
            FirstName = "Mario",
            LastName = "Rossi",
            AuthProvider = "App",
            Password = "Password123!",
            PhoneCountryCode = "+39",
            City = "Roma"
        });

        await action.Should().ThrowAsync<InvalidOperationException>();
    }

    [Fact]
    public async Task LoginWithGoogleAsync_Throws_WhenTokenIsInvalid()
    {
        _googleAuthServiceMock
            .Setup(service => service.ValidateTokenAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(false);

        var userService = CreateService();

        var action = async () => await userService.LoginWithGoogleAsync(new GoogleLoginRequest
        {
            Email = "utente@test.it",
            GoogleToken = "invalid-token"
        });

        await action.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task LoginWithGoogleAsync_CreatesUser_WhenNotExists()
    {
        var now = DateTime.UtcNow;

        _googleAuthServiceMock
            .Setup(service => service.ValidateTokenAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        _userRepositoryMock
            .Setup(repository => repository.GetByEmailAsync("utente@test.it"))
            .ReturnsAsync((User?)null);

        _userRepositoryMock
            .Setup(repository => repository.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User user) =>
            {
                user.Id = 42;
                return user;
            });

        _jwtServiceMock
            .Setup(service => service.GetTokenExpiration())
            .Returns(now.AddDays(7));

        _jwtServiceMock
            .Setup(service => service.GetRefreshTokenExpiration())
            .Returns(now.AddDays(30));

        _jwtServiceMock
            .Setup(service => service.GenerateRefreshToken())
            .Returns("refresh-token");

        _jwtServiceMock
            .Setup(service => service.HashRefreshToken("refresh-token"))
            .Returns("refresh-token-hash");

        _jwtServiceMock
            .Setup(service => service.GenerateToken(It.IsAny<User>(), It.IsAny<DateTime>()))
            .Returns("jwt-token");

        var userService = CreateService();
        var response = await userService.LoginWithGoogleAsync(new GoogleLoginRequest
        {
            Email = "utente@test.it",
            GoogleToken = "valid-token"
        });

        response.Token.Should().Be("jwt-token");
        response.RefreshToken.Should().Be("refresh-token");
        response.User.Email.Should().Be("utente@test.it");
        response.User.AuthProvider.Should().Be("Google");
        response.User.Id.Should().Be(42);

        _userRepositoryMock.Verify(repository => repository.CreateAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task LoginAsync_Throws_WhenPasswordIsInvalid()
    {
        _userRepositoryMock
            .Setup(repository => repository.GetByEmailAsync("utente@test.it"))
            .ReturnsAsync(new User
            {
                Id = 7,
                Email = "utente@test.it",
                FirstName = "Utente",
                LastName = "Test",
                AuthProvider = "App",
                PasswordHash = PasswordHashing.HashPassword("Password123!"),
                PhoneCountryCode = "+39",
                City = "Roma",
                CreatedAt = DateTime.UtcNow
            });

        var userService = CreateService();

        var action = async () => await userService.LoginAsync(new PasswordLoginRequest
        {
            Email = "utente@test.it",
            Password = "WrongPassword!"
        });

        await action.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task LoginAsync_ReturnsTokens_WhenPasswordIsValid()
    {
        var now = DateTime.UtcNow;
        var user = new User
        {
            Id = 11,
            Email = "utente@test.it",
            FirstName = "Utente",
            LastName = "Test",
            AuthProvider = "App",
            PasswordHash = PasswordHashing.HashPassword("Password123!"),
            PhoneCountryCode = "+39",
            City = "Roma",
            CreatedAt = now
        };

        _userRepositoryMock
            .Setup(repository => repository.GetByEmailAsync("utente@test.it"))
            .ReturnsAsync(user);

        _jwtServiceMock
            .Setup(service => service.GetTokenExpiration())
            .Returns(now.AddDays(1));

        _jwtServiceMock
            .Setup(service => service.GetRefreshTokenExpiration())
            .Returns(now.AddDays(30));

        _jwtServiceMock
            .Setup(service => service.GenerateRefreshToken())
            .Returns("refresh-token-login");

        _jwtServiceMock
            .Setup(service => service.HashRefreshToken("refresh-token-login"))
            .Returns("refresh-token-login-hash");

        _jwtServiceMock
            .Setup(service => service.GenerateToken(It.IsAny<User>(), It.IsAny<DateTime>()))
            .Returns("jwt-token-login");

        var userService = CreateService();
        var response = await userService.LoginAsync(new PasswordLoginRequest
        {
            Email = "utente@test.it",
            Password = "Password123!"
        });

        response.Token.Should().Be("jwt-token-login");
        response.RefreshToken.Should().Be("refresh-token-login");
        response.User.Id.Should().Be(11);
        response.User.Email.Should().Be("utente@test.it");
    }

    private UserService CreateService() =>
        new(_userRepositoryMock.Object, _jwtServiceMock.Object, _googleAuthServiceMock.Object);
}