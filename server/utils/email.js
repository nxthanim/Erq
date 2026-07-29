const { RESEND_API_KEY, CLIENT_URL } = process.env;

let resendClient = null;

/**
 * Lazy-load Resend client — only initializes if API key is configured.
 * This allows the app to run without Resend in development/demo mode.
 */
function getResend() {
  if (resendClient) return resendClient;
  if (!RESEND_API_KEY) {
    console.warn('⚠️  RESEND_API_KEY not configured. Emails will not be sent (dev mode).');
    return null;
  }
  try {
    const { Resend } = require('resend');
    resendClient = new Resend(RESEND_API_KEY);
    return resendClient;
  } catch (err) {
    console.error('❌ Failed to initialize Resend:', err.message);
    return null;
  }
}

/**
 * Send a transactional email via Resend.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body content
 * @param {string} [options.from] - Sender (defaults to Erq Marketplace)
 * @returns {Promise<{success: boolean, data?: any, error?: string, skipped?: boolean}>}
 */
async function sendEmail({ to, subject, html, from }) {
  const resend = getResend();
  if (!resend) {
    console.log(`📧 [DEV MODE] Would send to ${to}: ${subject}`);
    return { success: false, error: 'Resend not configured', skipped: true };
  }

  try {
    const sender = from || 'Erq Marketplace <noreply@erq.et>';
    const { data, error } = await resend.emails.send({
      from: sender,
      to,
      subject,
      html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return { success: false, error: error.message };
    }

    console.log(`✅ Email sent to ${to}: ${subject} (id: ${data?.id})`);
    return { success: true, data };
  } catch (err) {
    console.error('❌ Failed to send email:', err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendEmail, getResend };
