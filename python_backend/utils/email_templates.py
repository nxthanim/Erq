"""HTML email templates for transactional emails."""

BRAND = {
    "name": "Erq Marketplace",
    "primary_color": "#16a34a",
    "secondary_color": "#15803d",
    "bg_light": "#faf7f2",
    "bg_card": "#f5efe6",
    "text_primary": "#433930",
    "text_secondary": "#75644f",
}


def _email_wrapper(content: str) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{BRAND["name"]}</title>
</head>
<body style="margin:0;padding:0;background-color:{BRAND['bg_light']};font-family:'Nunito','Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:{BRAND['bg_light']};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,{BRAND['primary_color']},{BRAND['secondary_color']});border-radius:12px;padding:6px 16px;">
                    <span style="color:#fff;font-size:20px;font-weight:800;">E</span>
                    <span style="color:#fff;font-size:16px;font-weight:700;margin-left:4px;">rq</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:{BRAND['bg_card']};border-radius:20px;padding:40px 36px;
              box-shadow:0 10px 30px rgba(0,0,0,0.06),inset -4px -4px 12px rgba(0,0,0,0.02),inset 4px 4px 12px rgba(255,255,255,0.6);">
              {content}
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:{BRAND['text_secondary']};">© 2026 {BRAND["name"]}. Made in Ethiopia 🇪🇹</p>
              <p style="margin:4px 0 0;font-size:11px;color:{BRAND['text_secondary']};">If you didn't request this email, you can safely ignore it.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def password_reset_email(user_name: str, reset_link: str) -> str:
    content = f"""
    <div style="text-align:center;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,{BRAND['primary_color']},{BRAND['secondary_color']});border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="font-size:26px;">🔐</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:{BRAND['text_primary']};">Password Reset</h1>
      <p style="margin:0 0 24px;font-size:15px;color:{BRAND['text_secondary']};line-height:1.5;">
        Hi{' <strong>' + user_name + '</strong>' if user_name else ''},<br>
        We received a request to reset your password for your Erq account.
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,{BRAND['primary_color']},{BRAND['secondary_color']});border-radius:50px;padding:0;">
            <a href="{reset_link}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:50px;">Reset Password</a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;color:{BRAND['text_secondary']};line-height:1.5;">
        Or copy this link into your browser:<br>
        <a href="{reset_link}" style="color:{BRAND['primary_color']};font-size:12px;word-break:break-all;">{reset_link}</a>
      </p>
      <hr style="border:none;border-top:1px solid #ebe0d0;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:{BRAND['text_secondary']};line-height:1.5;">
        <strong>Didn't request this?</strong><br>
        If you didn't request a password reset, you can safely ignore this email. Your account remains secure.
      </p>
    </div>"""
    return _email_wrapper(content)


def notification_email(title: str, message: str, cta_text: str = "", cta_link: str = "") -> str:
    cta = ""
    if cta_text and cta_link:
        cta = f"""
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr>
            <td style="background:linear-gradient(135deg,{BRAND['primary_color']},{BRAND['secondary_color']});border-radius:50px;padding:0;">
              <a href="{cta_link}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:50px;">{cta_text}</a>
            </td>
          </tr>
        </table>"""
    content = f"""
    <div style="text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:{BRAND['text_primary']};">{title}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:{BRAND['text_secondary']};line-height:1.5;">{message}</p>
      {cta}
    </div>"""
    return _email_wrapper(content)
