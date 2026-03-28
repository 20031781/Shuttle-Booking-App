using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.Push;
using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Controller per gestire le operazioni sugli utenti.
/// </summary>
[ApiController]
[Route("[controller]")]
public class UserController(IUserService userService, IPushNotificationService pushNotificationService) : ControllerBase
{
    /// <summary>
    ///     Registra un nuovo utente.
    /// </summary>
    /// <param name="request">I dati dell'utente da registrare.</param>
    /// <returns>L'utente registrato.</returns>
    /// <response code="201">Utente registrato con successo.</response>
    /// <response code="400">Errore nella richiesta.</response>
    /// <response code="409">Utente già esistente con questa email.</response>
    [HttpPost("register")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<UserDto>> Register([FromBody] RegisterUserRequest request)
    {
        try
        {
            var user = await userService.RegisterUserAsync(request);
            return CreatedAtAction(nameof(GetMe), null, user);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status400BadRequest
            });
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict
            });
        }
    }

    /// <summary>
    ///     Effettua il login con email e password.
    /// </summary>
    /// <param name="request">Credenziali utente.</param>
    /// <returns>I dati di accesso dell'utente.</returns>
    /// <response code="200">Login effettuato con successo.</response>
    /// <response code="401">Credenziali non valide.</response>
    [HttpPost("Login")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] PasswordLoginRequest request)
    {
        try
        {
            var response = await userService.LoginAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status401Unauthorized
            });
        }
    }

    /// <summary>
    ///     Effettua il login con Google.
    /// </summary>
    /// <param name="request">I dati per il login con Google.</param>
    /// <returns>I dati di accesso dell'utente.</returns>
    /// <response code="200">Login effettuato con successo.</response>
    /// <response code="401">Credenziali non valide.</response>
    /// <response code="400">Errore nella richiesta.</response>
    [HttpPost("LoginWithGoogle")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<LoginResponse>> LoginWithGoogle([FromBody] GoogleLoginRequest request)
    {
        try
        {
            var response = await userService.LoginWithGoogleAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status401Unauthorized
            });
        }
    }

    /// <summary>
    ///     Emette un nuovo access token partendo da un refresh token valido.
    /// </summary>
    [HttpPost("RefreshToken")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<LoginResponse>> RefreshToken([FromBody] RefreshTokenRequest request)
    {
        try
        {
            var response = await userService.RefreshTokenAsync(request);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status401Unauthorized
            });
        }
    }

    /// <summary>
    ///     Registra o aggiorna il push token del device corrente.
    /// </summary>
    [HttpPost("DeviceToken")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RegisterDeviceToken([FromBody] DeviceTokenRequest request)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new ErrorResponse
            {
                Message = "Token utente non valido.",
                StatusCode = StatusCodes.Status401Unauthorized
            });

        try
        {
            await userService.RegisterDeviceTokenAsync(userId, request);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound
            });
        }
    }

    /// <summary>
    ///     Invia una notifica push di test al device dell'utente autenticato.
    /// </summary>
    [HttpPost("SendTestPush")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status502BadGateway)]
    public async Task<IActionResult> SendTestPush([FromBody] SendTestPushRequest request,
        CancellationToken cancellationToken)
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new ErrorResponse
            {
                Message = "Token utente non valido.",
                StatusCode = StatusCodes.Status401Unauthorized
            });

        var title = string.IsNullOrWhiteSpace(request.Title) ? "Test ShuttleBooking" : request.Title.Trim();
        var body = string.IsNullOrWhiteSpace(request.Body)
            ? "Notifica di test inviata dal backend."
            : request.Body.Trim();

        var result = await pushNotificationService.SendToUserAsync(
            userId,
            title,
            body,
            request.Data,
            cancellationToken);

        return result.Status switch
        {
            PushSendStatus.Sent => Ok(new { message = "Notifica push inviata con successo." }),
            PushSendStatus.UserNotFound => NotFound(new ErrorResponse
            {
                Message = result.Details ?? "Utente non trovato.",
                StatusCode = StatusCodes.Status404NotFound
            }),
            PushSendStatus.NotConfigured or PushSendStatus.MissingDeviceToken => BadRequest(new ErrorResponse
            {
                Message = result.Details ?? "Invio push non configurato.",
                StatusCode = StatusCodes.Status400BadRequest
            }),
            _ => StatusCode(StatusCodes.Status502BadGateway, new ErrorResponse
            {
                Message = result.Details ?? "Errore provider push.",
                StatusCode = StatusCodes.Status502BadGateway
            })
        };
    }

    /// <summary>
    ///     Revoca la sessione corrente.
    /// </summary>
    [HttpPost("Logout")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Logout()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new ErrorResponse
            {
                Message = "Token utente non valido.",
                StatusCode = StatusCodes.Status401Unauthorized
            });

        try
        {
            await userService.LogoutAsync(userId);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status404NotFound
            });
        }
    }

    /// <summary>
    ///     Ottiene il profilo dell'utente autenticato.
    /// </summary>
    [HttpGet("Me")]
    [Authorize]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<UserDto>> GetMe()
    {
        if (!TryGetUserId(out var userId))
            return Unauthorized(new ErrorResponse
            {
                Message = "Token utente non valido.",
                StatusCode = StatusCodes.Status401Unauthorized
            });

        var user = await userService.GetUserByIdAsync(userId);
        if (user != null) return Ok(user);

        return NotFound(new ErrorResponse
        {
            Message = $"Utente con ID {userId} non trovato",
            StatusCode = StatusCodes.Status404NotFound
        });
    }

    private bool TryGetUserId(out int userId)
    {
        userId = 0;
        var rawUserId = User.FindFirstValue("userId") ?? User.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(rawUserId, out userId);
    }
}