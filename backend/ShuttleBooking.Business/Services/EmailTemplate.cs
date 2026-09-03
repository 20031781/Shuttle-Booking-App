namespace ShuttleBooking.Business.Services;

/// <summary>
///     Layout HTML compatibile con i client email, con CSS inline e tabelle.
/// </summary>
public static class EmailTemplate
{
    private const string BrandName = "ShuttleBooking";
    private const string FontStack = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

    public static string Wrap(string? logoUrl, string bodyHtml)
    {
        var logo = string.IsNullOrWhiteSpace(logoUrl)
            ? string.Empty
            : $"""<img src="{logoUrl}" width="64" height="64" alt="{BrandName}" style="display:block;width:64px;height:64px;border:0;border-radius:14px;"/>""";

        return $"""
                <div style="margin:0;padding:24px 0;background-color:#f4f6f8;font-family:{FontStack};">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
                         style="border-collapse:collapse;background-color:#f4f6f8;">
                    <tr>
                      <td align="center" style="padding:0 16px;">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600"
                               style="border-collapse:collapse;width:100%;max-width:600px;background-color:#ffffff;border-radius:12px;">
                          <tr>
                            <td align="center" style="padding:32px 32px 12px 32px;">
                              {logo}
                              <div style="padding-top:12px;font-size:18px;font-weight:700;color:#0f172a;">{BrandName}</div>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding:4px 32px 32px 32px;color:#334155;font-size:15px;line-height:22px;">
                              {bodyHtml}
                            </td>
                          </tr>
                        </table>
                        <div style="max-width:600px;padding:16px 8px;color:#94a3b8;font-size:12px;line-height:18px;text-align:center;">
                          Email automatica inviata da {BrandName}: non rispondere a questo messaggio.
                        </div>
                      </td>
                    </tr>
                  </table>
                </div>
                """;
    }

    public static string Paragraph(string html) => $"""<p style="margin:0 0 16px 0;">{html}</p>""";
}