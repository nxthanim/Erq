/**
 * HTML email templates for Erq Marketplace transactional emails.
 * Uses the claymorphism brand colors from the app's design.
 */

const BRAND = {
  name: 'Erq Marketplace',
  primaryColor: '#16a34a',
  secondaryColor: '#15803d',
  bgLight: '#faf7f2',
  bgCard: '#f5efe6',
  textPrimary: '#433930',
  textSecondary: '#75644f',
  logo: 'https://erq.et/favicon.svg',
};

/**
 * Generate the base email wrapper (HTML + head + body structure)
 */
function emailWrapper(content) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND.name}</title>
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bgLight};font-family:'Nunito','Segoe UI','Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.bgLight};padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:12px;padding:6px 16px;">
                    <span style="color:#fff;font-size:20px;font-weight:800;">E</span>
                    <span style="color:#fff;font-size:16px;font-weight:700;margin-left:4px;">rq</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Content Card -->
          <tr>
            <td style="background-color:${BRAND.bgCard};border-radius:20px;padding:40px 36px;
              box-shadow:0 10px 30px rgba(0,0,0,0.06),inset -4px -4px 12px rgba(0,0,0,0.02),inset 4px 4px 12px rgba(255,255,255,0.6);">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:${BRAND.textSecondary};">
                © ${new Date().getFullYear()} ${BRAND.name}. Made in Ethiopia 🇪🇹
              </p>
              <p style="margin:4px 0 0;font-size:11px;color:${BRAND.textSecondary};">
                If you didn't request this email, you can safely ignore it.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Password Reset Email
 */
function passwordResetEmail({ userName, resetLink }) {
  const content = `
    <div style="text-align:center;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="font-size:26px;">🔐</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.textPrimary};">Password Reset</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textSecondary};line-height:1.5;">
        Hi${userName ? ` <strong>${userName}</strong>` : ''},<br>
        We received a request to reset your password for your Erq account.
        Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:50px;padding:0;">
            <a href="${resetLink}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:50px;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;color:${BRAND.textSecondary};line-height:1.5;">
        Or copy this link into your browser:<br>
        <a href="${resetLink}" style="color:${BRAND.primaryColor};font-size:12px;word-break:break-all;">${resetLink}</a>
      </p>
      <hr style="border:none;border-top:1px solid #ebe0d0;margin:24px 0;">
      <p style="margin:0;font-size:13px;color:${BRAND.textSecondary};line-height:1.5;">
        <strong>Didn't request this?</strong><br>
        If you didn't request a password reset, you can safely ignore this email.
        Your account remains secure.
      </p>
    </div>
  `;
  return emailWrapper(content);
}

/**
 * Welcome Email (sent after signup)
 */
function welcomeEmail({ userName }) {
  const content = `
    <div style="text-align:center;">
      <div style="width:56px;height:56px;background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;">
        <span style="font-size:26px;">🎉</span>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:${BRAND.textPrimary};">Welcome to Erq!</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textSecondary};line-height:1.5;">
        Hi${userName ? ` <strong>${userName}</strong>` : ''},<br>
        Welcome to Ethiopia's premier freelance marketplace! We're excited to have you on board.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:50px;padding:0;">
            <a href="https://erq.et/marketplace" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:50px;">
              Explore Marketplace
            </a>
          </td>
        </tr>
      </table>
    </div>
  `;
  return emailWrapper(content);
}

/**
 * Generic Notification Email
 */
function notificationEmail({ title, message, ctaText, ctaLink }) {
  const content = `
    <div style="text-align:center;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:800;color:${BRAND.textPrimary};">${title}</h1>
      <p style="margin:0 0 24px;font-size:15px;color:${BRAND.textSecondary};line-height:1.5;">${message}</p>
      ${ctaText && ctaLink ? `
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND.primaryColor},${BRAND.secondaryColor});border-radius:50px;padding:0;">
            <a href="${ctaLink}" target="_blank" style="display:inline-block;padding:14px 36px;font-size:15px;font-weight:700;color:#fff;text-decoration:none;border-radius:50px;">
              ${ctaText}
            </a>
          </td>
        </tr>
      </table>
      ` : ''}
    </div>
  `;
  return emailWrapper(content);
}

module.exports = { passwordResetEmail, welcomeEmail, notificationEmail, emailWrapper };
