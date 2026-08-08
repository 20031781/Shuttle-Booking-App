namespace ShuttleBooking.Business.Models.Auth;

public static class Roles
{
    public const string Admin = "Admin";
    public const string Manager = "Manager";

    /// <summary>Per [Authorize(Roles = ...)]: elenco separato da virgole, valutato in OR.</summary>
    public const string AdminOrManager = $"{Admin},{Manager}";

    public static readonly IReadOnlyCollection<string> All = [Admin, Manager];
}
