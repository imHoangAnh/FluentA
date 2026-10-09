using System.Net;
using System.Text;

namespace FluentA.Application.BoundedContexts.Auth;

public static class AuthEmailTemplates
{
    public static string BuildVerificationOtpEmailHtml(string fullName, string otp, int expirationMinutes = 15)
    {
        var encodedName = WebUtility.HtmlEncode(fullName);
        var normalizedOtp = (otp ?? string.Empty).PadRight(6, ' ');

        var otpCells = new StringBuilder();
        for (var i = 0; i < 6; i++)
        {
            var digit = WebUtility.HtmlEncode(normalizedOtp[i].ToString());
            otpCells.Append($"""
                  <td style="width:50px;height:58px;background:#ECFEFF;border:1px solid #99F6E4;border-radius:12px;text-align:center;vertical-align:middle;font-size:24px;font-weight:700;color:#0F766E;">
                    {digit}
                  </td>

""");
        }

        return $$"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>FluentA Account Verification</title>
</head>

<body style="margin:0;padding:32px 16px;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table role="presentation" width="560" cellspacing="0" cellpadding="0"
          style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center"
              style="padding:36px 40px;background:linear-gradient(135deg,#14B8A6,#0F766E);">
              <h1 style="margin:0;color:#FFFFFF;font-size:30px;font-weight:700;">
                FluentA
              </h1>

              <p style="margin:8px 0 0;color:#CCFBF1;font-size:15px;">
                Account Verification
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
                Hello <strong>{{encodedName}}</strong>,
              </p>

              <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#4B5563;">
                Thank you for signing up for a <strong>FluentA</strong> account.
              </p>

              <p style="margin:0 0 22px;font-size:16px;font-weight:600;color:#111827;">
                Your account verification code is:
              </p>

              <!-- OTP -->
              <table role="presentation" align="center" cellspacing="10" cellpadding="0"
                style="margin:8px auto 28px;">
                <tr>
{{otpCells.ToString().TrimEnd()}}
                </tr>
              </table>

              <!-- Expire Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;color:#0F766E;">
                    ⏱ <strong>This code will expire in {{expirationMinutes}} minutes.</strong>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:32px 0 24px;">
                    <div style="height:1px;background:#E5E7EB;"></div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:14px;line-height:1.7;color:#6B7280;">
                If you did not request this verification, you can safely ignore this email.
              </p>

              <p style="margin:0;font-size:15px;line-height:1.8;color:#374151;">
                Thank you,
              </p>

              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#0F766E;">
                The FluentA Team
              </p>

            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding:18px 20px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                © 2026 FluentA. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
""";
    }

    public static string BuildPasswordResetEmailHtml(string fullName, string resetUrl, int expirationMinutes = 30)
    {
        var encodedName = WebUtility.HtmlEncode(fullName);
        var encodedUrl = WebUtility.HtmlEncode(resetUrl);

        return $$"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your FluentA Password</title>
</head>

<body style="margin:0;padding:32px 16px;background:#F5F7F8;font-family:Arial,Helvetica,sans-serif;color:#1F2937;">

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">

        <!-- Email Card -->
        <table role="presentation" width="560" cellspacing="0" cellpadding="0"
          style="background:#FFFFFF;border:1px solid #E5E7EB;border-radius:18px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td align="center"
              style="padding:36px 40px;background:linear-gradient(135deg,#14B8A6,#0F766E);">
              <h1 style="margin:0;color:#FFFFFF;font-size:30px;font-weight:700;">
                FluentA
              </h1>

              <p style="margin:8px 0 0;color:#CCFBF1;font-size:15px;">
                Password Reset Request
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">

              <p style="margin:0 0 18px;font-size:16px;line-height:1.7;">
                Hello <strong>{{encodedName}}</strong>,
              </p>

              <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#4B5563;">
                We received a request to reset the password for your
                <strong>FluentA</strong> account.
              </p>

              <p style="margin:0 0 30px;font-size:16px;line-height:1.7;color:#4B5563;">
                Click the button below to create a new password.
              </p>

              <!-- Button -->
              <table role="presentation" align="center" cellspacing="0" cellpadding="0"
                style="margin:0 auto 30px;">
                <tr>
                  <td align="center" bgcolor="#14B8A6"
                    style="border-radius:12px;">
                    <a href="{{encodedUrl}}"
                      style="display:inline-block;padding:15px 32px;font-size:16px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:12px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Backup Link -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;font-size:13px;color:#6B7280;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>

                    <p style="margin:0;font-size:13px;word-break:break-all;color:#0F766E;">
                      {{encodedUrl}}
                    </p>
                  </td>
                </tr>
              </table>

              <div style="height:24px;"></div>

              <!-- Notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
                style="background:#F0FDFA;border:1px solid #CCFBF1;border-radius:12px;">
                <tr>
                  <td style="padding:14px 18px;font-size:14px;color:#0F766E;">
                    🔒 <strong>This password reset link will expire in {{expirationMinutes}} minutes.</strong>
                  </td>
                </tr>
              </table>

              <!-- Divider -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding:32px 0 24px;">
                    <div style="height:1px;background:#E5E7EB;"></div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#6B7280;">
                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
              </p>

              <p style="margin:0;font-size:15px;line-height:1.8;color:#374151;">
                Thank you,
              </p>

              <p style="margin:4px 0 0;font-size:16px;font-weight:700;color:#0F766E;">
                The FluentA Team
              </p>

            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="560" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="padding:18px 20px;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;">
                © 2026 FluentA. All rights reserved.
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>

</body>
</html>
""";
    }
}

