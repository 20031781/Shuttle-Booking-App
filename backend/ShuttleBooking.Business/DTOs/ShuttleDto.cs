using System.ComponentModel.DataAnnotations;

namespace ShuttleBooking.Business.DTOs;

public class ShuttleDto
{
    public int Id { get; init; }

    [Required(ErrorMessage = "Il nome dello shuttle è obbligatorio.")]
    public string Name { get; init; } = string.Empty;

    [Range(1, 100, ErrorMessage = "La capacità deve essere maggiore di zero.")]
    public int Capacity { get; init; }
}

public class CreateShuttleDto(int capacity)
{
    [Required(ErrorMessage = "Il nome dello shuttle è obbligatorio.")]
    public string Name { get; init; } = string.Empty;

    [Range(1, 100, ErrorMessage = "La capacità deve essere maggiore di zero.")]
    public int Capacity { get; } = capacity;
}