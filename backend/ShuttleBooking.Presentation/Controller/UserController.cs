using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ShuttleBooking.Business.Models;
using ShuttleBooking.Business.Models.User;
using ShuttleBooking.Business.Services;

namespace ShuttleBooking.Presentation.Controller;

/// <summary>
///     Controller per gestire le operazioni sugli utenti.
/// </summary>
[ApiController]
[Route("[controller]")]
public class UserController(IUserService userService) : ControllerBase
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
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Register([FromBody] RegisterUserRequest request)
    {
        try
        {
            var user = await userService.RegisterUserAsync(request);
            return Created($"/user/byEmail/{user.Email}", user);
        }
        catch (InvalidOperationException ex)
        {
            Console.WriteLine("Tentativo di registrazione con email già esistente");
            return Conflict(new ErrorResponse
            {
                Message = ex.Message,
                StatusCode = StatusCodes.Status409Conflict
            });
        }
        catch (Exception)
        {
            return BadRequest(new ErrorResponse
            {
                Message = "Errore durante la registrazione dell'utente",
                StatusCode = StatusCodes.Status400BadRequest
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
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> LoginWithGoogle([FromBody] GoogleLoginRequest request)
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
        catch (Exception)
        {
            return BadRequest(new ErrorResponse
            {
                Message = "Errore durante il login con Google",
                StatusCode = StatusCodes.Status400BadRequest
            });
        }
    }

    /// <summary>
    ///     Ottiene un utente tramite email.
    /// </summary>
    /// <param name="email">L'email dell'utente da cercare.</param>
    /// <returns>L'utente con l'email specificata.</returns>
    /// <response code="200">Utente trovato.</response>
    /// <response code="404">Utente non trovato.</response>
    [HttpGet("byEmail/{email}")]
    // [Authorize]
    // [ProducesResponseType(typeof(UserDto), StatusCodes.Status200OK)]
    // [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetByEmail(string email)
    {
        try
        {
            var user = await userService.GetUserByEmailAsync(email);

            if (user == null)
                return NotFound(new ErrorResponse
                {
                    Message = $"Utente con email {email} non trovato",
                    StatusCode = StatusCodes.Status404NotFound
                });

            return Ok(user);
        }
        catch (Exception)
        {
            return BadRequest(new ErrorResponse
            {
                Message = "Errore durante il recupero dell'utente",
                StatusCode = StatusCodes.Status400BadRequest
            });
        }
    }
}