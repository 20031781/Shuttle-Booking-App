namespace ShuttleBooking.Business.Models.Admin;

public static class EmailAllowlist
{
    public static bool Contains(string? email, IEnumerable<string> allowedEmails)
    {
        if (string.IsNullOrWhiteSpace(email)) return false;

        return allowedEmails.Any(allowedEmail => string.Equals(allowedEmail, email, StringComparison.OrdinalIgnoreCase));
    }
}
