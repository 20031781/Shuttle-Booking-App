using System.Text.Json.Serialization;

namespace ShuttleBookingApp.Presentation.Models;

public class GoogleUserInfo
{
    // Campi da OAuth UserInfo
    [JsonPropertyName("sub")] public string Id { get; init; } = string.Empty;
    [JsonPropertyName("email")] public string Email { get; init; } = string.Empty;
    [JsonPropertyName("name")] public string Name { get; init; } = string.Empty;
    [JsonPropertyName("given_name")] public string GivenName { get; init; } = string.Empty;
    [JsonPropertyName("family_name")] public string FamilyName { get; init; } = string.Empty;
    [JsonPropertyName("picture")] public string Picture { get; init; } = string.Empty;
    [JsonPropertyName("email_verified")] public bool VerifiedEmail { get; init; }

    // Campi da People API
    [JsonPropertyName("resourceName")] public string ResourceName { get; set; } = string.Empty;
    [JsonPropertyName("phoneNumbers")] public List<PhoneNumber>? PhoneNumbers { get; set; }
    [JsonPropertyName("addresses")] public List<Address>? Addresses { get; set; }
    [JsonPropertyName("names")] public List<Name>? Names { get; set; }
    [JsonPropertyName("emailAddresses")] public List<EmailAddress>? EmailAddresses { get; set; }

    // Proprietà calcolate per compatibilità
    [JsonIgnore] public string Phone => PhoneNumbers?.FirstOrDefault()?.Value ?? string.Empty;
    [JsonIgnore] public string PhoneCountryCode => PhoneNumbers?.FirstOrDefault()?.GetCountryCode() ?? string.Empty;
    [JsonIgnore] public string Address => Addresses?.FirstOrDefault()?.FormattedValue ?? string.Empty;
    [JsonIgnore] public string City => Addresses?.FirstOrDefault()?.City ?? string.Empty;
}

public class PhoneNumber
{
    [JsonPropertyName("value")] public string Value { get; init; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("canonicalForm")] public string CanonicalForm { get; init; } = string.Empty;

    public string GetCountryCode()
    {
        if (string.IsNullOrEmpty(CanonicalForm) || !CanonicalForm.StartsWith('+'))
            return string.Empty;

        var plusIndex = CanonicalForm.IndexOf('+');
        if (plusIndex < 0) return string.Empty;

        var spaceIndex = CanonicalForm.IndexOf(' ', plusIndex);
        return spaceIndex > plusIndex
            ? CanonicalForm.Substring(plusIndex, spaceIndex - plusIndex)
            :
            // Se non c'è uno spazio, prova a prendere i primi TRE caratteri (incluso il +)
            CanonicalForm.Substring(plusIndex, Math.Min(3, CanonicalForm.Length - plusIndex));
    }
}

public class Address
{
    [JsonPropertyName("formattedValue")] public string FormattedValue { get; init; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
    [JsonPropertyName("streetAddress")] public string StreetAddress { get; set; } = string.Empty;
    [JsonPropertyName("city")] public string City { get; init; } = string.Empty;
    [JsonPropertyName("postalCode")] public string PostalCode { get; set; } = string.Empty;
    [JsonPropertyName("region")] public string Region { get; set; } = string.Empty;
    [JsonPropertyName("country")] public string Country { get; set; } = string.Empty;
}

public class Name
{
    [JsonPropertyName("displayName")] public string DisplayName { get; set; } = string.Empty;
    [JsonPropertyName("givenName")] public string GivenName { get; set; } = string.Empty;
    [JsonPropertyName("familyName")] public string FamilyName { get; set; } = string.Empty;
}

public class EmailAddress
{
    [JsonPropertyName("value")] public string Value { get; set; } = string.Empty;
    [JsonPropertyName("type")] public string Type { get; set; } = string.Empty;
}