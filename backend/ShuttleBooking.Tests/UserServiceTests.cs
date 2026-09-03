using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using ShuttleBooking.Business.Models.Admin;
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
    private readonly Mock<IUserRoleRepository> _userRoleRepositoryMock = new();

    [Fact]
    public async Task RegisterUserAsync_SetsProfileIncomplete_WhenMandatoryFieldsAreMissing()
    {
        _userRepositoryMock
            .Setup(repository => repository.ExistsByEmailAsync("utente.incomplete@test.it"))
            .ReturnsAsync(false);

        User? createdUser = null;
        _userRepositoryMock
            .Setup(repository => repository.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User user) =>
            {
                user.Id = 99;
                createdUser = user;
                return user;
            });

        var userService = CreateService();

        var result = await userService.RegisterUserAsync(new RegisterUserRequest
        {
            Email = "utente.incomplete@test.it",
            AuthProvider = "App",
            Password = "Password123!"
        });

        createdUser.Should().NotBeNull();
        createdUser!.FirstName.Should().BeEmpty();
        createdUser.LastName.Should().BeEmpty();
        createdUser.City.Should().BeEmpty();
        createdUser.Club.Should().BeNull();
        createdUser.IsProfileCompleted.Should().BeFalse();

        result.IsProfileCompleted.Should().BeFalse();
    }

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
    public async Task RegisterAndLoginAsync_ReturnsTokensAndUser()
    {
        var now = DateTime.UtcNow;
        User? createdUser = null;

        _userRepositoryMock
            .Setup(repository => repository.ExistsByEmailAsync("utente.register@test.it"))
            .ReturnsAsync(false);

        _userRepositoryMock
            .Setup(repository => repository.ExistsByUsernameAsync(It.IsAny<string>(), It.IsAny<int?>()))
            .ReturnsAsync(false);

        _userRepositoryMock
            .Setup(repository => repository.CreateAsync(It.IsAny<User>()))
            .ReturnsAsync((User user) =>
            {
                user.Id = 88;
                createdUser = user;
                return user;
            });

        _userRepositoryMock
            .Setup(repository => repository.GetByIdAsync(88))
            .ReturnsAsync(() => createdUser);

        _jwtServiceMock
            .Setup(service => service.GetTokenExpiration())
            .Returns(now.AddHours(1));

        _jwtServiceMock
            .Setup(service => service.GetRefreshTokenExpiration())
            .Returns(now.AddDays(30));

        _jwtServiceMock
            .Setup(service => service.GenerateRefreshToken())
            .Returns("refresh-token-register");

        _jwtServiceMock
            .Setup(service => service.HashRefreshToken("refresh-token-register"))
            .Returns("refresh-token-register-hash");

        _jwtServiceMock
            .Setup(service =>
                service.GenerateToken(It.IsAny<User>(), It.IsAny<IEnumerable<string>>(), It.IsAny<DateTime>()))
            .Returns("jwt-token-register");

        _userRepositoryMock
            .Setup(repository => repository.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User updatedUser) => updatedUser);

        var userService = CreateService();

        var response = await userService.RegisterAndLoginAsync(new RegisterUserRequest
        {
            Email = "utente.register@test.it",
            AuthProvider = "App",
            Password = "Password123!"
        });

        response.Token.Should().Be("jwt-token-register");
        response.RefreshToken.Should().Be("refresh-token-register");
        response.User.Email.Should().Be("utente.register@test.it");
    }

    [Fact]
    public async Task LoginWithGoogleAsync_Throws_WhenTokenIsInvalid()
    {
        _googleAuthServiceMock
            .Setup(service => service.ValidateIdTokenAsync("invalid-token"))
            .ThrowsAsync(new InvalidOperationException("Firma token non valida."));

        var userService = CreateService();

        var action = async () => await userService.LoginWithGoogleAsync(new GoogleLoginRequest
        {
            IdToken = "invalid-token"
        });

        await action.Should().ThrowAsync<UnauthorizedAccessException>();
    }

    [Fact]
    public async Task LoginWithGoogleAsync_CreatesUser_WhenNotExists()
    {
        var now = DateTime.UtcNow;

        _googleAuthServiceMock
            .Setup(service => service.ValidateIdTokenAsync("valid-token"))
            .ReturnsAsync(new GoogleIdentity(
                "google-subject-42",
                "Utente@Test.It",
                "Mario Rossi",
                "https://example.test/avatar.png",
                true));

        _userRepositoryMock
            .Setup(repository => repository.GetByGoogleIdAsync("google-subject-42"))
            .ReturnsAsync((User?)null);

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
            .Setup(service =>
                service.GenerateToken(It.IsAny<User>(), It.IsAny<IEnumerable<string>>(), It.IsAny<DateTime>()))
            .Returns("jwt-token");

        var userService = CreateService();
        var response = await userService.LoginWithGoogleAsync(new GoogleLoginRequest
        {
            IdToken = "valid-token"
        });

        response.Token.Should().Be("jwt-token");
        response.RefreshToken.Should().Be("refresh-token");
        response.User.Email.Should().Be("utente@test.it");
        response.User.AuthProvider.Should().Be("Google");
        response.User.Id.Should().Be(42);
        response.User.FirstName.Should().Be("Mario");
        response.User.LastName.Should().Be("Rossi");

        _userRepositoryMock.Verify(repository => repository.CreateAsync(It.IsAny<User>()), Times.Once);
    }

    [Fact]
    public async Task LoginWithGoogleAsync_LinksExistingUserByVerifiedGoogleEmail()
    {
        var existingUser = new User
        {
            Id = 73,
            Email = "utente@test.it",
            FirstName = "Utente",
            LastName = "Esistente",
            AuthProvider = "App",
            PhoneCountryCode = "+39",
            City = "Roma",
            CreatedAt = DateTime.UtcNow
        };

        _googleAuthServiceMock
            .Setup(service => service.ValidateIdTokenAsync("valid-token"))
            .ReturnsAsync(new GoogleIdentity(
                "google-subject-existing",
                "utente@test.it",
                "Utente Esistente",
                "https://example.test/avatar.png",
                true));
        _userRepositoryMock
            .Setup(repository => repository.GetByGoogleIdAsync("google-subject-existing"))
            .ReturnsAsync((User?)null);
        _userRepositoryMock
            .Setup(repository => repository.GetByEmailAsync("utente@test.it"))
            .ReturnsAsync(existingUser);
        _userRepositoryMock
            .Setup(repository => repository.LinkGoogleAccountAsync(
                existingUser.Id,
                "google-subject-existing",
                "https://example.test/avatar.png"))
            .ReturnsAsync(() =>
            {
                existingUser.GoogleId = "google-subject-existing";
                existingUser.ProfilePicture = "https://example.test/avatar.png";
                return existingUser;
            });

        var userService = CreateService();
        var response = await userService.LoginWithGoogleAsync(new GoogleLoginRequest { IdToken = "valid-token" });

        response.User.Id.Should().Be(existingUser.Id);
        response.User.AuthProvider.Should().Be("App");
        existingUser.GoogleId.Should().Be("google-subject-existing");
        _userRepositoryMock.Verify(repository => repository.CreateAsync(It.IsAny<User>()), Times.Never);
        _userRepositoryMock.Verify(repository => repository.LinkGoogleAccountAsync(
            existingUser.Id,
            "google-subject-existing",
            "https://example.test/avatar.png"), Times.Once);
    }

    [Fact]
    public async Task LoginWithGoogleAsync_DoesNotReplaceAnExistingGoogleIdentity()
    {
        var existingUser = new User
        {
            Id = 74,
            Email = "utente@test.it",
            FirstName = "Utente",
            LastName = "Esistente",
            AuthProvider = "Google",
            GoogleId = "google-subject-original",
            PhoneCountryCode = "+39",
            City = "Roma",
            CreatedAt = DateTime.UtcNow
        };

        _googleAuthServiceMock
            .Setup(service => service.ValidateIdTokenAsync("different-google-token"))
            .ReturnsAsync(new GoogleIdentity(
                "google-subject-different",
                "utente@test.it",
                "Utente Esistente",
                "https://example.test/avatar.png",
                true));
        _userRepositoryMock
            .Setup(repository => repository.GetByGoogleIdAsync("google-subject-different"))
            .ReturnsAsync((User?)null);
        _userRepositoryMock
            .Setup(repository => repository.GetByEmailAsync("utente@test.it"))
            .ReturnsAsync(existingUser);

        var userService = CreateService();
        var action = () => userService.LoginWithGoogleAsync(
            new GoogleLoginRequest { IdToken = "different-google-token" });

        await action.Should().ThrowAsync<UnauthorizedAccessException>();
        _userRepositoryMock.Verify(repository => repository.LinkGoogleAccountAsync(
            It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>()), Times.Never);
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
            .Setup(service =>
                service.GenerateToken(It.IsAny<User>(), It.IsAny<IEnumerable<string>>(), It.IsAny<DateTime>()))
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

    [Fact]
    public async Task CompleteUserProfileAsync_UpdatesMandatoryFields_AndMarksProfileAsCompleted()
    {
        var user = new User
        {
            Id = 17,
            Email = "utente@test.it",
            FirstName = string.Empty,
            LastName = string.Empty,
            AuthProvider = "App",
            PasswordHash = PasswordHashing.HashPassword("Password123!"),
            PhoneCountryCode = "+39",
            City = string.Empty,
            Club = null,
            IsProfileCompleted = false,
            CreatedAt = DateTime.UtcNow
        };

        _userRepositoryMock
            .Setup(repository => repository.GetByIdAsync(17))
            .ReturnsAsync(user);

        _userRepositoryMock
            .Setup(repository => repository.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User updatedUser) => updatedUser);

        var userService = CreateService();
        var result = await userService.CompleteUserProfileAsync(17, new CompleteUserProfileRequest
        {
            FirstName = "Lorenzo",
            LastName = "Appetito",
            Club = "Shuttle Club",
            City = "Roma"
        });

        result.FirstName.Should().Be("Lorenzo");
        result.LastName.Should().Be("Appetito");
        result.Club.Should().Be("Shuttle Club");
        result.City.Should().Be("Roma");
        result.IsProfileCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateNotificationPreferencesAsync_UpdatesBookingNotificationFlags()
    {
        var user = new User
        {
            Id = 23,
            Email = "utente@test.it",
            FirstName = "Utente",
            LastName = "Test",
            AuthProvider = "App",
            PhoneCountryCode = "+39",
            City = "Roma",
            CreatedAt = DateTime.UtcNow
        };

        _userRepositoryMock
            .Setup(repository => repository.GetByIdAsync(23))
            .ReturnsAsync(user);

        _userRepositoryMock
            .Setup(repository => repository.UpdateAsync(It.IsAny<User>()))
            .ReturnsAsync((User updatedUser) => updatedUser);

        var userService = CreateService();
        await userService.UpdateNotificationPreferencesAsync(23, new UpdateNotificationPreferencesRequest
        {
            BookingConfirmations = false,
            BookingCancellations = true
        });

        user.NotifyOnBookingConfirmation.Should().BeFalse();
        user.NotifyOnBookingCancellation.Should().BeTrue();
    }

    private UserService CreateService()
    {
        _userRoleRepositoryMock
            .Setup(repository => repository.GetRolesAsync(It.IsAny<int>()))
            .ReturnsAsync(Array.Empty<string>());

        return new UserService(
            _userRepositoryMock.Object,
            _userRoleRepositoryMock.Object,
            _jwtServiceMock.Object,
            _googleAuthServiceMock.Object,
            Options.Create(new AdminDashboardOptions()),
            Options.Create(new ManagerDashboardOptions()));
    }
}