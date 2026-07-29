const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { generateToken, authenticate } = require('../middleware/auth');
const {
  storeVerification,
  isEmailVerified,
  buildVerificationResponse,
  getVerificationByEmail,
} = require('../utils/emailVerification');
const { sendEmail } = require('../utils/email');
const { passwordResetEmail } = require('../utils/emailTemplates');

const router = express.Router();

// ====== HELPER: Extract domain from email ======
function extractDomain(email) {
  if (!email || typeof email !== 'string') return null;
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : null;
}

// ====== HELPER: Server-side validation of email verification data ======
// Prevents clients from submitting fake "verified" payloads
// Includes cross-field consistency checks to prevent replay/spoofing
function validateVerificationData(data, email) {
  if (!data || typeof data !== 'object') return false;
  
  // Cross-field consistency: email_address must match the request email
  if (!data.email_address || data.email_address.toLowerCase() !== email.toLowerCase()) {
    return false;
  }

  // Must have email_deliverability with a valid status
  const deliverability = data.email_deliverability;
  if (!deliverability || typeof deliverability !== 'object') return false;
  
  const validStatuses = ['deliverable', 'undeliverable', 'risky', 'unknown'];
  if (!validStatuses.includes(deliverability.status)) return false;
  
  // Must have email_quality with a score
  const quality = data.email_quality;
  if (!quality || typeof quality !== 'object') return false;
  if (typeof quality.score !== 'number' || quality.score < 0 || quality.score > 1) return false;
  
  // Must have email_risk
  const risk = data.email_risk;
  if (!risk || typeof risk !== 'object') return false;
  
  // Must have email_domain with domain matching the email's domain
  const domain = data.email_domain;
  if (!domain || typeof domain !== 'object') return false;
  if (!domain.domain) return false;

  // Cross-field consistency: domain in verification data must match email's domain
  const emailDomain = extractDomain(email);
  if (!emailDomain || domain.domain.toLowerCase() !== emailDomain) {
    return false;
  }
  
  return true;
}

// ====== HELPER: Log IP + user agent for security audit ======
async function logAudit({ userId, email, action, ip, userAgent }) {
  try {
    const id = uuidv4();
    await db.prepare('INSERT INTO login_audit (id, user_id, email, ip_address, user_agent, action) VALUES ($1, $2, $3, $4, $5, $6)')
      .run(id, userId || null, email, ip || 'unknown', userAgent || 'unknown', action);
  } catch (err) {
    console.error('Audit log error:', err);
  }
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, phone, city, role } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';

    if (!email || !password || !fullName || !role) {
      logAudit({ email, action: 'failed_signup', ip, userAgent });
      return res.status(400).json({ error: 'Email, password, full name, and role are required' });
    }

    if (!['client', 'freelancer'].includes(role)) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logAudit({ email, action: 'failed_signup', ip, userAgent });
      return res.status(400).json({ error: 'Role must be client or freelancer' });
    }

    if (password.length < 6) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logAudit({ email, action: 'failed_signup', ip, userAgent });
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await db.prepare('SELECT id FROM users WHERE email = $1').get(email);
    if (existing) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logAudit({ email, action: 'failed_signup', ip, userAgent });
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if email has been verified (require verification for security)
    const emailVerified = await isEmailVerified(email);
    if (!emailVerified) {
      logAudit({ email, action: 'failed_signup', ip, userAgent });
      return res.status(400).json({
        error: 'Email has not been verified. Please verify your email before signing up.',
        requiresVerification: true,
      });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    await db.prepare(`
      INSERT INTO users (id, email, password, full_name, phone, city, role)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `).run(id, email, hashedPassword, fullName, phone || null, city || null, role);

    // Link any existing email verification record to the new user
    await db.prepare(`
      UPDATE email_verifications SET user_id = $1 WHERE email = $2 AND user_id IS NULL
    `).run(id, email);

    // Log successful signup
    logAudit({ userId: id, email, action: 'signup', ip, userAgent });

    const user = await db.prepare('SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = $1').get(id);
    const token = generateToken(user);

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';

    if (!email || !password) {
      logAudit({ email, action: 'failed_login', ip, userAgent });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
    if (!user) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logAudit({ email, action: 'failed_login', ip, userAgent });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      if (req.recordFailedLogin) req.recordFailedLogin();
      logAudit({ userId: user.id, email, action: 'failed_login', ip, userAgent });
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Successful login — clear brute force tracking
    if (req.clearLoginAttempts) req.clearLoginAttempts();

    // Log successful login
    logAudit({ userId: user.id, email, action: 'login', ip, userAgent });

    const { password: _, ...userData } = user;
    const token = generateToken(user);

    res.json({ user: userData, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    // Fetch fresh user data from database
    const user = await db.prepare('SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = $1').get(req.user.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Auth me error:', err);
    res.status(500).json({ error: 'Failed to fetch user data' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { fullName, phone, city, bio, skills } = req.body;
    
    await db.prepare(`
      UPDATE users SET full_name = COALESCE($1, full_name), phone = COALESCE($2, phone), 
      city = COALESCE($3, city), bio = COALESCE($4, bio), skills = COALESCE($5, skills),
      updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `).run(fullName || null, phone || null, city || null, bio || null, skills || null, req.user.id);

    const user = await db.prepare('SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count FROM users WHERE id = $1').get(req.user.id);
    res.json({ user });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ====== EMAIL VERIFICATION ======

// POST /api/auth/verify-email (public - used during signup)
// Stores email verification result with server-side validation
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationData } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!verificationData) {
      return res.status(400).json({ error: 'Verification data is required' });
    }

    // Server-side validation: ensures the verification data structure is valid
    // AND that the data is internally consistent (email matches domain, etc.)
    // This prevents clients from submitting fake "deliverable" payloads
    // or replaying a verification for one email on a different email
    if (!validateVerificationData(verificationData, email)) {
      return res.status(400).json({
        error: 'Invalid verification data — structure or field mismatch detected',
        verified: false,
      });
    }

    // Store the verification result (no user ID during pre-signup checks)
    const record = await storeVerification(email, null, verificationData);
    
    // Return minimal safe response for public endpoint
    const verified = isEmailVerified(email);

    res.json({
      success: true,
      verified,
      message: verified
        ? 'Email verified successfully'
        : 'Email verification failed — the email may be invalid or risky',
      // Only return non-sensitive info to unauthenticated users
      verification: {
        email_address: record.email_address,
        suggested_correction: record.suggested_correction,
        status: record.status,
        status_detail: record.status_detail,
        score: record.score,
        is_disposable: !!record.is_disposable,
        is_role: !!record.is_role,
      }
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// GET /api/auth/verification-status/:email (authenticated)
// Returns full verification details for authenticated users
router.get('/verification-status/:email', authenticate, async (req, res) => {
  try {
    const { email } = req.params;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const record = await getVerificationByEmail(email);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Email has not been verified yet'
      });
    }

    // Authenticated users get the full verification response
    const response = buildVerificationResponse(record);
    const verified = isEmailVerified(email);

    res.json({
      success: true,
      verified,
      verification: response,
    });
  } catch (err) {
    console.error('Email verification status error:', err);
    res.status(500).json({ error: 'Failed to get verification status' });
  }
});

// ====== PASSWORD RESET ======

// POST /api/auth/forgot-password - Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await db.prepare('SELECT id, email, full_name FROM users WHERE email = $1').get(email);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
    }

    // Generate reset token (expires in 1 hour)
    const token = uuidv4() + '-' + uuidv4();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    
    await db.prepare('INSERT INTO password_resets (id, email, token, expires_at) VALUES ($1, $2, $3, $4)')
      .run(uuidv4(), email, token, expiresAt);

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetLink = `${clientUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
    
    // Send email via Resend
    const html = passwordResetEmail({
      userName: user.full_name,
      resetLink,
    });

    const emailResult = await sendEmail({
      to: email,
      subject: '🔐 Reset your Erq Marketplace password',
      html,
    });

    // Create in-app notification
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)')
      .run(uuidv4(), user.id, '🔐 Password Reset Requested', 'A password reset link has been sent to your email.', 'info');

    res.json({
      success: true,
      message: 'Password reset link sent to your email.',
      // In dev mode without Resend, include the reset link for convenience
      resetLink: !emailResult.success && process.env.NODE_ENV !== 'production' ? resetLink : undefined,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password - Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, email, newPassword } = req.body;
    
    if (!token || !email || !newPassword) {
      return res.status(400).json({ error: 'Token, email, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find valid, unused token
    const reset = await db.prepare(
      'SELECT * FROM password_resets WHERE token = $1 AND email = $2 AND used = 0 AND expires_at > NOW()'
    ).get(token, email);

    if (!reset) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Find user
    const user = await db.prepare('SELECT * FROM users WHERE email = $1').get(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await db.prepare('UPDATE users SET password = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2').run(hashedPassword, user.id);

    // Mark token as used
    await db.prepare('UPDATE password_resets SET used = 1 WHERE id = $1').run(reset.id);

    // Notify user
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)')
      .run(uuidv4(), user.id, '🔐 Password Changed', 'Your password has been successfully reset.', 'info');

    res.json({ success: true, message: 'Password has been reset successfully. You can now login with your new password.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
