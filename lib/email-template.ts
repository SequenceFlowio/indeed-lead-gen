export interface TemplateVars {
  body: string;
  subject: string;
  company: string;
  title: string;
  location: string;
  salary: string;
  url: string;
  from_name: string;
  from_email: string;
}

export function renderTemplate(html: string, vars: TemplateVars): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key as keyof TemplateVars] ?? "");
}

export const DEFAULT_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="nl">
<head>
<meta charset="UTF-8">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
</head>
<body data-ogsc="" style="margin:0;padding:0;background:#f4f4f4;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- HEADER BANNER -->
        <tr>
          <td style="padding:0;font-size:0;line-height:0;">
            <a href="https://sequenceflow.io" style="display:block;text-decoration:none;">
              <img src="https://sequenceflow.io/images/email-banner-top.webp" width="600" alt="SequenceFlow" style="display:block;width:100%;max-width:600px;border:0;" />
            </a>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:40px;background:#ffffff;">
            <p style="font-size:15px;color:#333333;line-height:1.75;white-space:pre-line;margin:0 0 32px;font-family:Arial,sans-serif;">{{body}}</p>

            <!-- REPLY CTA -->
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 32px;">
              <tr>
                <td style="background:#0A0A0A;border-radius:8px;">
                  <a href="mailto:{{from_email}}?subject=Re: {{subject}}" style="display:inline-block;padding:14px 28px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;font-family:Arial,sans-serif;">Reageer op deze email →</a>
                </td>
              </tr>
            </table>

            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;">
              <tr><td style="border-top:1px solid #eeeeee;font-size:0;line-height:0;">&nbsp;</td></tr>
            </table>

            <!-- LEAD INFO -->
            <p style="font-size:11px;font-weight:700;text-transform:uppercase;color:#aaaaaa;margin:0 0 8px;letter-spacing:.5px;font-family:Arial,sans-serif;">Bedrijfsdetails</p>
            <p style="font-size:13px;color:#555555;margin:0 0 24px;font-family:Arial,sans-serif;line-height:1.8;">
              Bedrijf: {{company}}<br>
              Vacature: {{title}}<br>
              Locatie: {{location}}<br>
              Salaris: {{salary}}<br>
              <a href="{{url}}" style="color:#0A0A0A;font-weight:600;text-decoration:none;">Bekijk vacature →</a>
            </p>

            <p style="font-size:13px;color:#888888;margin:0;font-family:Arial,sans-serif;">Vragen? Mail naar <a href="mailto:{{from_email}}" style="color:#0A0A0A;font-weight:600;text-decoration:none;">{{from_email}}</a></p>
          </td>
        </tr>

        <!-- FOOTER BANNER -->
        <tr>
          <td style="background-image:url('https://sequenceflow.io/images/email-banner-down.webp');background-color:#0A0A0A;background-size:cover;background-position:center;padding:20px 40px;text-align:center;">
            <p style="font-size:12px;color:#666666;margin:0;font-family:Arial,sans-serif;">© SequenceFlow · Amsterdam · <a href="https://sequenceflow.io" style="color:#666666;text-decoration:none;">sequenceflow.io</a></p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
