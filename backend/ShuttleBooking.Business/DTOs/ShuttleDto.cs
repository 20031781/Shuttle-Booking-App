using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.DTOs;

public class ShuttleDto
{
    public int Id { get; init; }

    [Required(ErrorMessage = "Il nome dello shuttle è obbligatorio.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Il nome deve essere lungo tra 1 e 100 caratteri.")]
    public string Name { get; init; } = string.Empty;

    [Range(1, 100, ErrorMessage = "La capacità deve essere maggiore di zero.")]
    public int Capacity { get; init; }

    [Range(0, 100, ErrorMessage = "I posti disponibili devono essere compresi tra 0 e 100.")]
    public int AvailableSeats { get; init; }
}

public class CreateShuttleDto
{
    [Required(ErrorMessage = "Il nome dello shuttle è obbligatorio.")]
    [StringLength(100, MinimumLength = 1, ErrorMessage = "Il nome deve essere lungo tra 1 e 100 caratteri.")]
    public string Name { get; init; } = string.Empty;

    [Range(1, 100, ErrorMessage = "La capacità deve essere maggiore di zero.")]
    public int Capacity { get; init; }
}

public class UpdateShuttleCapacityRequest
{
    [Range(1, 100, ErrorMessage = "La capacità deve essere maggiore di zero e minore di 101.")]
    public int Capacity { get; init; }
}