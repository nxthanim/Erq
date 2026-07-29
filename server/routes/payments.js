const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');
const { notificationEmail } = require('../utils/emailTemplates');

const router = express.Router();

// Ensure upload directories exist (gracefully handle read-only serverless)
const BIOMETRIC_DIR = path.join(__dirname, '../../uploads/biometric-confirmations');
const RECEIPT_DIR = path.join(__dirname, '../../uploads/receipts');
try {
  if (!fs.existsSync(BIOMETRIC_DIR)) fs.mkdirSync(BIOMETRIC_DIR, { recursive: true });
  if (!fs.existsSync(RECEIPT_DIR)) fs.mkdirSync(RECEIPT_DIR, { recursive: true });
} catch (err) {
  console.warn('⚠️ Cannot create upload dirs (read-only filesystem?):', err.message);
}

// Admin email for fraud alerts
const ADMIN_EMAIL = 'auxtechnologies@proton.me';

// ====== FRAUD DETECTION ENGINE ======
async function analyzeReceiptRisk({ amount, reference, itemType, userId, itemId }) {
  const riskFactors = [];
  let riskScore = 0;

  // Check 1: Suspicious reference patterns (very short, long, or unusual characters)
  if (!reference || reference.length < 4) {
    riskFactors.push('Missing or too short receipt reference');
    riskScore += 25;
  }
  if (reference && reference.length > 100) {
    riskFactors.push('Unusually long receipt reference');
    riskScore += 15;
  }
  if (reference && /[<>{}|\\^~`]/.test(reference)) {
    riskFactors.push('Suspicious characters in reference');
    riskScore += 20;
  }

  // Check 2: Unusual amounts
  if (amount <= 0) {
    riskFactors.push('Invalid amount (zero or negative)');
    riskScore += 30;
  }
  if (amount > 1000000) {
    riskFactors.push('Unusually high amount (> ETB 1,000,000)');
    riskScore += 20;
  }

  // Check 3: Rapid repeat from same user
  const recentReceipts = await db.prepare(`
    SELECT COUNT(*) as count FROM payment_receipts 
    WHERE user_id = ? AND created_at > NOW() - INTERVAL '1 hour'
  `).get(userId);
  if (recentReceipts.count > 3) {
    riskFactors.push(`Suspicious activity: ${recentReceipts.count} receipts submitted in the last hour`);
    riskScore += 25;
  }

  // Check 4: Reference is just numbers (possible fake reference)
  if (reference && /^\d{4,8}$/.test(reference)) {
    riskFactors.push('Reference is simple numeric sequence (possible fake)');
    riskScore += 10;
  }

  // Check 5: Check if this reference was used before by other users
  const duplicateRef = await db.prepare(`
    SELECT COUNT(*) as count FROM payment_receipts 
    WHERE receipt_reference = ? AND user_id != ?
  `).get(reference, userId);
  if (duplicateRef.count > 0) {
    riskFactors.push(`Receipt reference already used by ${duplicateRef.count} other user(s) — possible fraud`);
    riskScore += 30;
  }

  const status = riskScore >= 30 ? 'suspicious' : 'verified';

  return { riskScore: Math.min(riskScore, 100), riskFactors, status };
}

// POST /api/payments/verify-receipt — Submit payment receipt for verification before quick order
router.post('/verify-receipt', authenticate, async (req, res) => {
  try {
    const { itemType, itemId, amount, receiptPhoto, receiptReference } = req.body;

    if (!itemType || !itemId || !amount || !receiptPhoto || !receiptReference) {
      return res.status(400).json({ error: 'All fields required: itemType, itemId, amount, receiptPhoto, receiptReference' });
    }

    if (!['gig', 'job'].includes(itemType)) {
      return res.status(400).json({ error: 'Invalid item type' });
    }

    // Save receipt photo
    const receiptFilename = `receipt-${uuidv4().slice(0, 8)}-${Date.now()}.jpg`;
    const receiptPath = path.join(RECEIPT_DIR, receiptFilename);
    const receiptBuffer = Buffer.from(receiptPhoto, 'base64');
    fs.writeFileSync(receiptPath, receiptBuffer);
    const receiptUrl = `/uploads/receipts/${receiptFilename}`;

    // Run fraud detection
    const { riskScore, riskFactors, status } = await analyzeReceiptRisk({
      amount: parseFloat(amount),
      reference: receiptReference,
      itemType,
      userId: req.user.id,
      itemId
    });

    // Store the receipt verification
    const receiptId = uuidv4();
    await db.prepare(`
      INSERT INTO payment_receipts (id, user_id, item_type, item_id, amount, receipt_photo, receipt_reference, status, risk_score, risk_factors)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(receiptId, req.user.id, itemType, itemId, parseFloat(amount), receiptUrl, receiptReference, status, riskScore, JSON.stringify(riskFactors));

    // If suspicious, send email alert to admin
    if (status === 'suspicious') {
      const user = await db.prepare('SELECT full_name, email, phone FROM users WHERE id = ?').get(req.user.id);

      const riskSummary = riskFactors.map(f => `• ${f}`).join('\n');
      const details = [
        `🔴 SUSPICIOUS PAYMENT RECEIPT DETECTED`,
        `──────────────────────────────`,
        `User: ${user?.full_name || 'Unknown'} (${req.user.id.slice(0, 8)})`,
        `Email: ${user?.email || 'N/A'}`,
        `Phone: ${user?.phone || 'N/A'}`,
        `Item Type: ${itemType}`,
        `Item ID: ${itemId}`,
        `Amount: ETB ${parseFloat(amount).toLocaleString()}`,
        `Reference: ${receiptReference}`,
        `Risk Score: ${riskScore}/100`,
        `Receipt URL: ${receiptUrl}`,
        ``,
        `Risk Factors:`,
        riskSummary,
        ``,
        `Timestamp: ${new Date().toISOString()}`,
        `──────────────────────────────`
      ].join('\n');

      await db.prepare('UPDATE payment_receipts SET admin_notified = 1 WHERE id = ?').run(receiptId);

      // Send email to admin
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🔴 SUSPICIOUS: Payment Receipt Verification Failed — ETB ${parseFloat(amount).toLocaleString()} — ${user?.full_name || 'Unknown'}`,
        html: notificationEmail({
          title: `🚨 Suspicious Payment Receipt - Risk Score: ${riskScore}/100`,
          message: `
            <strong>User:</strong> ${user?.full_name || 'Unknown'} (${user?.email || 'No email'})<br>
            <strong>Phone:</strong> ${user?.phone || 'N/A'}<br>
            <strong>Amount:</strong> ETB ${parseFloat(amount).toLocaleString()}<br>
            <strong>Reference:</strong> ${receiptReference}<br>
            <strong>Type:</strong> ${itemType} — ${itemId.slice(0, 8)}<br>
            <strong>Receipt:</strong> <a href="${receiptUrl}" style="color:#16a34a;">View Receipt Photo</a><br><br>
            <strong>Risk Factors:</strong><br>
            ${riskFactors.map(f => `• ${f}`).join('<br>')}
          `,
          ctaText: 'Review in Admin Dashboard',
          ctaLink: 'https://erq.et/admin'
        }),
      });

      console.log(`🚨 ADMIN ALERT: Suspicious receipt from ${user?.full_name} — Score: ${riskScore}/100 — Emailed ${ADMIN_EMAIL}`);
    }

    res.json({
      success: true,
      receiptId,
      status,
      riskScore,
      riskFactors,
      message: status === 'verified'
        ? 'Payment receipt verified. You may proceed with your order.'
        : 'Your payment receipt has been flagged for review. Our admin team has been notified and will verify your payment within 24 hours.'
    });

  } catch (err) {
    console.error('Receipt verification error:', err);
    res.status(500).json({ error: 'Failed to verify payment receipt' });
  }
});

// ====== HELPER: Log payment audit event ======
async function logPaymentAudit({ userId, transactionId, action, ip, userAgent, details }) {
  try {
    const id = uuidv4();
    await db.prepare('INSERT INTO payment_audit (id, user_id, transaction_id, action, ip_address, user_agent, details) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, userId, transactionId || null, action, ip || 'unknown', userAgent || 'unknown', JSON.stringify(details || {}));
  } catch (err) {
    console.error('Payment audit log error:', err);
  }
}

// ====== HELPER: Check biometric rate limit (max 3 attempts per hour per user) ======
async function checkBiometricRateLimit(userId) {
  const recentAttempts = await db.prepare(`
    SELECT COUNT(*) as count FROM payment_audit 
    WHERE user_id = ? AND action = 'biometric_attempt' 
    AND created_at > NOW() - INTERVAL '1 hour'
  `).get(userId);
  
  if (recentAttempts.count >= 3) {
    const firstAttempt = await db.prepare(`
      SELECT created_at FROM payment_audit 
      WHERE user_id = ? AND action = 'biometric_attempt' 
      ORDER BY created_at ASC LIMIT 1
    `).get(userId);
    return { blocked: true, attempts: recentAttempts.count, firstAttempt: firstAttempt?.created_at };
  }
  return { blocked: false, attempts: recentAttempts.count };
}

// POST /api/payments/confirm-biometric — Live biometric payment confirmation (selfie + audio)
router.post('/confirm-biometric', authenticate, async (req, res) => {
  try {
    const { transactionId, selfieData, audioData, mimeType } = req.body;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';
    
    if (!transactionId || !selfieData) {
      return res.status(400).json({ error: 'Transaction ID and selfie proof are required' });
    }

    // Check biometric rate limit (max 3 per hour)
    const rateCheck = await checkBiometricRateLimit(req.user.id);
    if (rateCheck.blocked) {
      logPaymentAudit({
        userId: req.user.id,
        transactionId,
        action: 'biometric_attempt',
        ip, userAgent,
        details: { blocked: true, reason: 'Rate limit exceeded', attempts: rateCheck.attempts }
      });
      return res.status(429).json({
        error: `Too many biometric attempts (${rateCheck.attempts} in the last hour). Please try again later.`,
        blockedUntil: new Date(new Date(rateCheck.firstAttempt).getTime() + 3600000).toISOString()
      });
    }

    // Log the attempt
    logPaymentAudit({
      userId: req.user.id,
      transactionId,
      action: 'biometric_attempt',
      ip, userAgent,
      details: { attemptNumber: rateCheck.attempts + 1 }
    });

    // Find the transaction and verify this user is the freelancer
    const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ? AND freelancer_id = ? AND status = ?')
      .get(transactionId, req.user.id, 'escrow');
    
    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found or not in escrow status' });
    }

    // Save selfie as file
    const selfieExt = mimeType?.includes('png') ? 'png' : 'jpg';
    const selfieFilename = `selfie-${transactionId.slice(0, 8)}-${Date.now()}.${selfieExt}`;
    const selfiePath = path.join(BIOMETRIC_DIR, selfieFilename);
    
    // Decode base64 and save
    const selfieBuffer = Buffer.from(selfieData, 'base64');
    fs.writeFileSync(selfiePath, selfieBuffer);

    // Save audio if provided
    let audioPath = null;
    if (audioData) {
      const audioFilename = `audio-${transactionId.slice(0, 8)}-${Date.now()}.webm`;
      audioPath = path.join(BIOMETRIC_DIR, audioFilename);
      const audioBuffer = Buffer.from(audioData, 'base64');
      fs.writeFileSync(audioPath, audioBuffer);
    }

    // Update transaction status to 'confirmed'
    await db.prepare(`
      UPDATE transactions 
      SET status = 'confirmed', 
          confirmation_selfie = ?,
          confirmation_audio = ?,
          confirmed_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(`/uploads/biometric-confirmations/${selfieFilename}`, audioPath ? `/uploads/biometric-confirmations/${path.basename(audioPath)}` : null, transactionId);

    // Log success
    await logPaymentAudit({
      userId: req.user.id,
      transactionId,
      action: 'biometric_success',
      ip, userAgent,
      details: { amount: transaction.amount, selfieFile: selfieFilename }
    });

    // Notify the client
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(transaction.job_id);
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, transaction.client_id, 'Payment Confirmed ✓',
        `${req.user.full_name || 'The freelancer'} has confirmed receipt of ETB ${transaction.amount} for "${job?.title}" via biometric verification.`,
        'payment');

    // If this is the 3rd successful biometric from this user, alert admin
    const totalSuccess = await db.prepare(`
      SELECT COUNT(*) as count FROM payment_audit 
      WHERE user_id = ? AND action = 'biometric_success'
    `).get(req.user.id);
    
    if (totalSuccess.count >= 10) {
      console.log(`⚠️ HIGH VOLUME: User ${req.user.id} has ${totalSuccess.count} biometric confirmations — possible automation`);
      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `⚠️ High biometric volume — ${req.user.full_name || 'User'} — ${totalSuccess.count} confirmations`,
        html: notificationEmail({
          title: '⚠️ High Volume Biometric Confirmations',
          message: `User <strong>${req.user.full_name || 'Unknown'}</strong> (${req.user.email}) has completed ${totalSuccess.count} biometric confirmations. This may indicate automated or unusual activity.`,
          ctaText: 'Review in Admin Dashboard',
          ctaLink: 'https://erq.et/admin'
        }),
      });
    }

    console.log(`🔐 BIOMETRIC CONFIRMATION: User ${req.user.id} confirmed payment of ETB ${transaction.amount} for transaction ${transactionId}`);

    res.json({
      success: true,
      message: 'Payment confirmed via biometric verification. The work can now proceed.',
      confirmedAt: new Date().toISOString()
    });

  } catch (err) {
    console.error('Biometric confirmation error:', err);
    res.status(500).json({ error: 'Failed to process biometric confirmation' });
  }
});

// POST /api/payments/initiate - Initiate TeleBirr payment for escrow
router.post('/initiate', authenticate, authorize('client'), async (req, res) => {
  try {
    const { jobId } = req.body;
    const transaction = await db.prepare(`
      SELECT t.*, j.title as job_title, j.client_id 
      FROM transactions t 
      JOIN jobs j ON t.job_id = j.id 
      WHERE t.job_id = ? AND t.status = 'escrow' AND t.client_id = ?
    `).get(jobId, req.user.id);

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    // Simulate TeleBirr payment initiation (sandbox)
    const telebirrRef = `TEBIRR-${uuidv4().slice(0, 8).toUpperCase()}`;
    
    await db.prepare('UPDATE transactions SET telebirr_reference = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(telebirrRef, transaction.id);

    res.json({
      success: true,
      message: 'Payment initiated. Please complete payment via TeleBirr.',
      telebirrRef,
      amount: transaction.amount,
      jobTitle: transaction.job_title
    });
  } catch (err) {
    console.error('Payment initiation error:', err);
    res.status(500).json({ error: 'Failed to initiate payment' });
  }
});

// POST /api/payments/confirm - Confirm TeleBirr payment
router.post('/confirm', authenticate, authorize('client'), async (req, res) => {
  try {
    const { transactionId, telebirrRef } = req.body;
    const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ? AND client_id = ?')
      .get(transactionId, req.user.id);

    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });

    await db.prepare('UPDATE transactions SET status = ?, telebirr_reference = COALESCE(?, telebirr_reference), updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run('escrow', telebirrRef || null, transactionId);

    // Notify freelancer
    const notifId = uuidv4();
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(transaction.job_id);
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, transaction.freelancer_id, 'Payment Confirmed', `Payment of ETB ${transaction.amount} for "${job?.title}" has been placed in escrow.`, 'payment');

    res.json({ success: true, message: 'Payment confirmed and held in escrow' });
  } catch (err) {
    console.error('Payment confirmation error:', err);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// POST /api/payments/release - Release payment from escrow to freelancer
router.post('/release', authenticate, authorize('client'), async (req, res) => {
  try {
    const { jobId } = req.body;
    const transaction = await db.prepare(`
      SELECT t.* FROM transactions t 
      JOIN jobs j ON t.job_id = j.id 
      WHERE t.job_id = ? AND t.status = 'escrow' AND j.client_id = ?
    `).get(jobId, req.user.id);

    if (!transaction) return res.status(404).json({ error: 'Escrow transaction not found' });

    await db.prepare('UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('released', transaction.id);
    await db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('completed', jobId);

    // Notify freelancer
    const notifId = uuidv4();
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(jobId);
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, transaction.freelancer_id, 'Payment Released', `ETB ${transaction.amount} for "${job?.title}" has been released to your account.`, 'payment');

    res.json({ success: true, message: 'Payment released to freelancer' });
  } catch (err) {
    console.error('Payment release error:', err);
    res.status(500).json({ error: 'Failed to release payment' });
  }
});

// POST /api/payments/dispute - Create a dispute
router.post('/dispute', authenticate, async (req, res) => {
  try {
    const { jobId, reason } = req.body;
    const transaction = await db.prepare('SELECT t.* FROM transactions t JOIN jobs j ON t.job_id = j.id WHERE t.job_id = ? AND (j.client_id = ? OR j.awarded_to = ?) AND t.status = ?')
      .get(jobId, req.user.id, req.user.id, 'escrow');

    if (!transaction) return res.status(404).json({ error: 'Active transaction not found' });

    await db.prepare('UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('disputed', transaction.id);

    // Notify admin
    const admins = await db.prepare('SELECT id FROM users WHERE role = ?').all('admin');
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(jobId);
    for (const admin of admins) {
      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), admin.id, 'New Dispute', `Dispute opened for job "${job?.title}". Reason: ${reason || 'Not specified'}`, 'dispute');
    }

    res.json({ success: true, message: 'Dispute created. Admin will review.' });
  } catch (err) {
    console.error('Dispute error:', err);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// GET /api/payments/transactions - Get user's transactions
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const transactions = await db.prepare(`
      SELECT t.*, COALESCE(j.title, 'Wallet Top-up') as job_title 
      FROM transactions t 
      LEFT JOIN jobs j ON t.job_id = j.id 
      WHERE t.client_id = ? OR t.freelancer_id = ?
      ORDER BY t.created_at DESC
    `).all(req.user.id, req.user.id);

    res.json({ transactions });
  } catch (err) {
    console.error('Error fetching transactions:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ====== CHAPA PAYMENT GATEWAY ======
// Initialize the Chapa SDK with the merchant's secret key
const Chapa = require('chapa-nodejs').default || require('chapa-nodejs');

// Chapa configuration
const CHAPA_MERCHANT_ID = process.env.CHAPA_MERCHANT_ID || '6897233';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY;
const CHAPA_PUBLIC_KEY = process.env.CHAPA_PUBLIC_KEY;
const CHAPA_ENCRYPTION_KEY = process.env.CHAPA_ENCRYPTION_KEY;

// Warn if Chapa keys not configured in production
if (!CHAPA_SECRET_KEY || !CHAPA_PUBLIC_KEY) {
  console.warn('⚠️ Chapa keys not configured. Set CHAPA_SECRET_KEY and CHAPA_PUBLIC_KEY in Vercel env vars for production payments.');
}

let chapaClient = null;
try {
  if (CHAPA_SECRET_KEY) {
    chapaClient = new Chapa({ secretKey: CHAPA_SECRET_KEY });
    console.log('✅ Chapa SDK initialized with merchant ID:', CHAPA_MERCHANT_ID);
  }
} catch (err) {
  console.warn('⚠️ Could not initialize Chapa SDK:', err.message);
}

// ====== HELPER: Verify Chapa webhook signature ======
function verifyChapaWebhookSignature(payload, signature) {
  if (!CHAPA_ENCRYPTION_KEY || !signature) return false;
  try {
    const expected = crypto
      .createHmac('sha256', CHAPA_ENCRYPTION_KEY)
      .update(JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// ====== HELPER: Verify Chapa payment via SDK ======
async function verifyChapaPayment(tx_ref) {
  if (!chapaClient || !tx_ref) {
    return { verified: false, error: 'Chapa SDK not available or missing tx_ref' };
  }
  try {
    const verification = await chapaClient.verify({ tx_ref });
    console.log(`✅ Chapa verify result for ${tx_ref}:`, JSON.stringify(verification).slice(0, 300));
    
    // Chapa returns status in verification.data.status
    const chapaStatus = verification?.data?.status;
    const isSuccess = chapaStatus === 'success';
    
    if (isSuccess) {
      // Only update escrow transactions (don't downgrade released wallet top-ups)
      await db.prepare(`
        UPDATE transactions SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP 
        WHERE telebirr_reference = ? AND status = 'escrow'
      `).run(tx_ref);
      console.log(`✅ Chapa payment verified and confirmed: ${tx_ref}`);
    }
    
    return {
      verified: isSuccess,
      status: chapaStatus,
      amount: verification?.data?.amount,
      currency: verification?.data?.currency,
      email: verification?.data?.email,
      first_name: verification?.data?.first_name,
      last_name: verification?.data?.last_name,
      transaction_id: verification?.data?.transaction_id,
      error: null,
    };
  } catch (err) {
    console.error('Chapa verification error:', err.message);
    return { verified: false, error: err.message };
  }
}

// POST /api/payments/chapa/initiate - Initiate a Chapa hosted payment (wallet OR gig order)
router.post('/chapa/initiate', authenticate, async (req, res) => {
  try {
    const { amount, currency, email, first_name, last_name, description, gigId, requirements, itemTitle } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const { v4: uuidv4 } = require('uuid');

    // Generate a unique transaction reference
    const tx_ref = `ERQ-${uuidv4().slice(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Check if this is a send-money or gig order
    let orderId = null;
    let isGigOrder = false;
    let isSendMoney = req.body.is_send_money === true;
    
    // Build metadata for send-money flow (store all 12+ recipient details)
    let metadata = {};
    if (isSendMoney) {
      metadata = {
        type: 'send_money',
        sender_id: req.user.id,
        recipient_id: req.body.recipient_id || null,
        recipient_fullName: req.body.recipient_name || req.body.recipient_fullName || '',
        recipient_email: req.body.recipient_email || '',
        recipient_phone: req.body.recipient_phone || '',
        recipient_bank: req.body.recipient_bank || '',
        recipient_account: req.body.recipient_account || '',
        recipient_city: req.body.recipient_city || '',
        recipient_region: req.body.recipient_region || '',
        recipient_relationship: req.body.recipient_relationship || '',
        recipient_purpose: req.body.recipient_purpose || '',
        recipient_reference: req.body.recipient_reference || '',
        recipient_expectedDate: req.body.recipient_expected_date || req.body.recipient_expectedDate || '',
        recipient_notes: req.body.recipient_notes || '',
        forwarded_at: new Date().toISOString(),
      };
      console.log(`💸 SEND MONEY initiated: ${tx_ref} — ETB ${amount} → ${metadata.recipient_fullName} (${metadata.recipient_email})`);
    }
    
    if (gigId) {
      isGigOrder = true;
      // Verify the gig exists and user isn't ordering their own
      const gig = await db.prepare(`
        SELECT g.*, u.full_name as freelancer_name 
        FROM gigs g JOIN users u ON g.freelancer_id = u.id 
        WHERE g.id = $1 AND g.active = 1
      `).get(gigId);
      
      if (!gig) return res.status(404).json({ error: 'Gig not found' });
      if (gig.freelancer_id === req.user.id) return res.status(400).json({ error: 'Cannot order your own gig' });
      
      // Create order in 'pending_payment' status
      orderId = uuidv4();
      const fullRequirements = requirements ? `[${itemTitle || 'Order'}]\n\n${requirements}` : '';
      await db.prepare(`
        INSERT INTO orders (id, gig_id, client_id, freelancer_id, title, description, price, requirements, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending_payment', NOW())
      `).run(orderId, gigId, req.user.id, gig.freelancer_id, gig.title, gig.description, parseFloat(amount), fullRequirements);
      
      console.log(`📦 Gig order created awaiting Chapa payment: ${orderId.slice(0, 8)} — ${gig.title} — ETB ${amount}`);
    }

    // Build callback & return URLs — for gig orders, return to a different page
    const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';
    const callback_url = `${BASE_URL}/api/payments/chapa/callback?tx_ref=${tx_ref}`;
    const return_url = isGigOrder
      ? `${BASE_URL}/orders?payment=success&tx_ref=${tx_ref}&order_id=${orderId}`
      : `${BASE_URL}/wallet?payment=success&tx_ref=${tx_ref}`;

    // Prepare payment data for Chapa
    const paymentTitle = isGigOrder ? (itemTitle || 'Gig Order Payment') : 'Payment via Erq Marketplace';
    const paymentDesc = isGigOrder
      ? (description || `Payment of ETB ${amount} for gig order on Erq Marketplace`)
      : (description || `Payment of ETB ${amount} on Erq Marketplace`);

    const paymentData = {
      amount: amount.toString(),
      currency: currency || 'ETB',
      email,
      first_name: first_name || 'Customer',
      last_name: last_name || 'User',
      tx_ref,
      callback_url,
      return_url,
      title: paymentTitle,
      description: paymentDesc,
      logo: 'https://chapa.link/asset/images/chapa_swirl.svg',
      meta: {
        title: 'Erq Marketplace Payment',
        merchant_id: CHAPA_MERCHANT_ID,
        order_id: orderId || '',
      },
    };

    let checkout_url = null;

    // ====== ALWAYS create transaction + generate checkout URL ======
    // Do this OUTSIDE the SDK try/catch so it works even if SDK is down/unavailable
    checkout_url = `${BASE_URL}/api/payments/chapa/checkout/${encodeURIComponent(tx_ref)}`;
    
    // Create the transaction record (always: wallet top-up, gig order, or send-money)
    // NOTE: metadata column may not exist in production DB yet, so we INSERT without it
    // then try to UPDATE metadata separately (graceful fallback)
    try {
      const txnId = uuidv4();
      
      if (isGigOrder) {
        await db.prepare(`
          INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status, telebirr_reference, order_id, created_at)
          VALUES ($1, $2, $3, $4, $5, 'pending_payment', $6, $7, NOW())
        `).run(txnId, gigId, req.user.id, 'system', parseFloat(amount), tx_ref, orderId);
        await db.prepare('UPDATE orders SET transaction_id = $1, updated_at = NOW() WHERE id = $2')
          .run(txnId, orderId);
      } else if (isSendMoney) {
        await db.prepare(`
          INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status, telebirr_reference, created_at)
          VALUES ($1, $2, $3, $4, $5, 'released', $6, NOW())
        `).run(txnId, 'send', req.user.id, req.body.recipient_id || 'system', parseFloat(amount), tx_ref);
      } else {
        await db.prepare(`
          INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status, telebirr_reference, created_at)
          VALUES ($1, $2, $3, $4, $5, 'released', $6, NOW())
        `).run(txnId, 'wallet', req.user.id, 'system', parseFloat(amount), tx_ref);
      }
      
      // Try to store metadata separately (graceful fallback if column doesn't exist)
      if (Object.keys(metadata).length > 0) {
        try {
          await db.prepare(`
            UPDATE transactions SET metadata = $1, updated_at = NOW() WHERE id = $2
          `).run(JSON.stringify(metadata), txnId);
        } catch (metaErr) {
          console.warn('⚠️ Could not store metadata (column may not exist yet):', metaErr.message);
        }
      }
      
      console.log(`💳 Chapa ${isGigOrder ? 'gig order' : isSendMoney ? 'send money' : 'wallet top-up'} initiated: ${tx_ref} — ETB ${amount}`);
    } catch (dbErr) {
      console.error('DB error creating Chapa transaction:', dbErr.message);
      // Don't fail — checkout form still works
    }

    // Try to use the Chapa SDK for a better checkout URL (enhancement, not required)
    // IMPORTANT: Wrap in a timeout so we NEVER hang — serverless functions can time out!
    if (chapaClient) {
      try {
        // 5-second timeout for the Chapa SDK call
        const SDK_TIMEOUT_MS = 5000;
        const sdkResult = await Promise.race([
          chapaClient.initialize(paymentData),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Chapa SDK timeout after 5s')), SDK_TIMEOUT_MS)),
        ]);
        console.log(`💳 Chapa SDK response:`, JSON.stringify(sdkResult).slice(0, 200));
        if (sdkResult?.data?.checkout_url) {
          checkout_url = sdkResult.data.checkout_url; // Override with SDK URL (better UX)
        }
      } catch (sdkErr) {
        console.error('Chapa SDK error (falling back to hosted form):', sdkErr.message);
        // Fallback: use the checkout_url we already built above
      }
    }

    // Always return checkout_url — either from SDK or from hosted form fallback
    res.json({
      success: true,
      tx_ref,
      order_id: orderId,
      is_gig_order: isGigOrder,
      merchant_id: CHAPA_MERCHANT_ID,
      public_key: CHAPA_PUBLIC_KEY,
      checkout_url,
      amount: amount.toString(),
      currency: currency || 'ETB',
      email,
      first_name: first_name || 'Customer',
      last_name: last_name || 'User',
      title: paymentTitle,
      description: paymentDesc,
      logo: 'https://chapa.link/asset/images/chapa_swirl.svg',
      callback_url,
      return_url,
    });
  } catch (err) {
    console.error('Chapa initiation error:', err);
    res.status(500).json({ error: 'Failed to initiate Chapa payment' });
  }
});

// POST /api/payments/chapa/verify - Verify a Chapa payment and update order if applicable
router.post('/chapa/verify', authenticate, async (req, res) => {
  try {
    const { tx_ref } = req.body;
    
    if (!tx_ref) {
      return res.status(400).json({ error: 'Transaction reference (tx_ref) is required' });
    }

    // Find the transaction in our database
    const transaction = await db.prepare(`
      SELECT * FROM transactions WHERE telebirr_reference = $1 AND client_id = $2
    `).get(tx_ref, req.user.id);

    if (!transaction) {
      // Try without client_id filter
      const anyTxn = await db.prepare(`
        SELECT * FROM transactions WHERE telebirr_reference = $1
      `).get(tx_ref);
      
      if (!anyTxn) {
        return res.status(404).json({ error: 'Transaction not found', verified: false });
      }
      
      if (anyTxn.status === 'confirmed' || anyTxn.status === 'released') {
        // If this was a gig order, mark it as pending (ready for freelancer)
        if (anyTxn.order_id) {
          await db.prepare("UPDATE orders SET status = 'pending', updated_at = NOW() WHERE id = $1 AND status = 'pending_payment'")
            .run(anyTxn.order_id);
        }
        return res.json({ verified: true, status: anyTxn.status, message: 'Payment already verified' });
      }
    }

    // Call the Chapa verify API via SDK
    const result = await verifyChapaPayment(tx_ref);
    
    if (result.verified) {
      // If this transaction has an associated order, update it
      if (transaction?.order_id) {
        // Update order from 'pending_payment' to 'pending' (waiting for freelancer accept)
        await db.prepare("UPDATE orders SET status = 'pending', updated_at = NOW() WHERE id = $1 AND status = 'pending_payment'")
          .run(transaction.order_id);
        
        // Update transaction from 'pending_payment' to 'escrow'
        await db.prepare("UPDATE transactions SET status = 'escrow', updated_at = NOW() WHERE id = $1")
          .run(transaction.id);
        
        // Get the order to notify the freelancer
        const order = await db.prepare('SELECT * FROM orders WHERE id = $1').get(transaction.order_id);
        if (order) {
          const notifId = uuidv4();
          await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)')
            .run(notifId, order.freelancer_id, 'New Order — Payment Confirmed!', 
              `${req.user.full_name || 'A client'} paid ETB ${order.price} for "${order.title}" via Chapa. Review and accept the order!`,
              'order');
        }
        
        console.log(`✅ Chapa payment verified for ORDER ${transaction.order_id.slice(0, 8)}: ${tx_ref}`);
      } else {
        // Wallet top-up — create notification
        const notifId = uuidv4();
        await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)')
          .run(notifId, req.user.id, 'Payment Verified ✓', 
            `Your Chapa payment of ETB ${result.amount || '...'} has been verified. Reference: ${tx_ref}`,
            'payment');
      }
    }

    res.json({
      verified: result.verified,
      status: result.status || 'unknown',
      amount: result.amount,
      currency: result.currency,
      transaction_ref: tx_ref,
      chapa_transaction_id: result.transaction_id,
      order_id: transaction?.order_id || null,
      message: result.verified 
        ? 'Payment verified successfully via Chapa API' 
        : `Payment verification returned status: ${result.status || 'unknown'}. ${result.error || ''}`,
    });
  } catch (err) {
    console.error('Chapa verify endpoint error:', err);
    res.status(500).json({ error: 'Failed to verify payment', verified: false });
  }
});



// GET /api/payments/chapa/checkout/:tx_ref - Renders auto-submitting HTML form to Chapa
// Used as fallback when Chapa SDK checkout_url is not available
router.get('/chapa/checkout/:tx_ref', async (req, res) => {
  const { tx_ref } = req.params;
  try {
    // Look up the transaction to get details
    const txn = await db.prepare('SELECT * FROM transactions WHERE telebirr_reference = $1').get(tx_ref);
    
    // Build the auto-submitting form HTML
    const amount = txn?.amount || '0';
    const email = txn?.client_id ? (await db.prepare('SELECT email FROM users WHERE id = $1').get(txn.client_id))?.email || '' : '';
    
    const return_url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/orders?payment=success&tx_ref=${tx_ref}`;
    const callback_url = `${process.env.CLIENT_URL || 'http://localhost:5173'}/api/payments/chapa/callback?tx_ref=${tx_ref}`;
    
    res.setHeader('Content-Type', 'text/html');
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Redirecting to Chapa...</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #f9fafb; }
          .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 4px 24px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
          .spinner { width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #f59e0b; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 1rem; }
          @keyframes spin { to { transform: rotate(360deg); } }
          h2 { color: #111827; margin-bottom: 0.5rem; }
          p { color: #6b7280; font-size: 0.875rem; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h2>Redirecting to Chapa...</h2>
          <p>You will be redirected to Chapa's secure payment page.</p>
          <form id="chapa-form" method="POST" action="https://api.chapa.co/v1/hosted/pay">
            <input type="hidden" name="public_key" value="${CHAPA_PUBLIC_KEY}" />
            <input type="hidden" name="tx_ref" value="${tx_ref}" />
            <input type="hidden" name="amount" value="${amount}" />
            <input type="hidden" name="currency" value="ETB" />
            <input type="hidden" name="email" value="${email}" />
            <input type="hidden" name="first_name" value="Customer" />
            <input type="hidden" name="last_name" value="User" />
            <input type="hidden" name="title" value="Erq Marketplace Payment" />
            <input type="hidden" name="description" value="Payment via Erq Marketplace" />
            <input type="hidden" name="logo" value="https://chapa.link/asset/images/chapa_swirl.svg" />
            <input type="hidden" name="callback_url" value="${callback_url}" />
            <input type="hidden" name="return_url" value="${return_url}" />
            <input type="hidden" name="meta[title]" value="Erq Marketplace Payment" />
            <noscript><button type="submit" style="margin-top:1rem;padding:0.75rem 1.5rem;background:#f59e0b;color:white;border:none;border-radius:0.5rem;cursor:pointer;">Continue to Chapa</button></noscript>
          </form>
          <script>document.getElementById('chapa-form').submit();</script>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('Chapa checkout page error:', err);
    res.redirect('/orders?payment=error');
  }
});

// GET /api/payments/chapa/callback - Chapa payment callback (webhook)
router.get('/chapa/callback', async (req, res) => {
  try {
    const { tx_ref, status, transaction_id } = req.query;
    const signature = req.headers?.['x-chapa-signature'] || '';
    
    console.log(`🔔 Chapa callback received:`, { tx_ref, status, transaction_id });

    // Verify webhook signature if encryption key is configured
    if (CHAPA_ENCRYPTION_KEY && signature) {
      const payload = { tx_ref, status, transaction_id };
      const isValid = verifyChapaWebhookSignature(payload, signature);
      if (!isValid) {
        console.warn(`⚠️ Chapa webhook signature verification FAILED for ${tx_ref}`);
      } else {
        console.log(`✅ Chapa webhook signature verified for ${tx_ref}`);
      }
    }

    // Verify the payment using Chapa SDK
    const result = await verifyChapaPayment(tx_ref);
    
    if (result.verified) {
      console.log(`✅ Chapa payment confirmed via callback: ${tx_ref}`);
    }

    res.redirect(`/wallet?payment=${result.verified ? 'success' : 'failed'}&tx_ref=${tx_ref}`);
  } catch (err) {
    console.error('Chapa callback error:', err);
    res.redirect('/wallet?payment=error');
  }
});

module.exports = router;
