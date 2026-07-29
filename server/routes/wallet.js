const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All wallet routes require authentication
router.use(authenticate);

// ====== SERVER-SIDE PIN RATE LIMITING ======
// Max 5 failed PIN attempts per 15-minute window per user
// Even if client-side localStorage is cleared, this server-side gate prevents brute force
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MINUTES = 15;

/**
 * Check if a user is currently rate-limited for PIN attempts.
 * Returns { blocked, blockedUntil, remainingAttempts, totalAttempts }
 */
async function checkPinRateLimit(userId) {
  // Count failed attempts in the last 15 minutes
  const recent = await db.prepare(`
    SELECT COUNT(*) as count FROM wallet_pin_attempts 
    WHERE user_id = $1 AND successful = 0 
    AND created_at > NOW() - INTERVAL '${PIN_WINDOW_MINUTES} minutes'
  `).get(userId);

  const totalAttempts = recent?.count || 0;
  const remainingAttempts = Math.max(0, PIN_MAX_ATTEMPTS - totalAttempts);

  if (totalAttempts >= PIN_MAX_ATTEMPTS) {
    // Find when the first attempt in this window happened to calculate unlock time
    const firstInWindow = await db.prepare(`
      SELECT created_at FROM wallet_pin_attempts 
      WHERE user_id = $1 AND successful = 0 
      AND created_at > NOW() - INTERVAL '${PIN_WINDOW_MINUTES} minutes'
      ORDER BY created_at ASC LIMIT 1
    `).get(userId);

    return {
      blocked: true,
      blockedUntil: new Date(new Date(firstInWindow.created_at).getTime() + PIN_WINDOW_MINUTES * 60 * 1000).toISOString(),
      remainingAttempts: 0,
      totalAttempts,
    };
  }

  return {
    blocked: false,
    blockedUntil: null,
    remainingAttempts,
    totalAttempts,
  };
}

// POST /api/wallet/pin-attempt - Record a PIN attempt (failed or successful)
router.post('/pin-attempt', async (req, res) => {
  try {
    const { type } = req.body; // 'failed' or 'success'
    const userId = req.user.id;
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers?.['user-agent'] || 'unknown';

    if (!['failed', 'success'].includes(type)) {
      return res.status(400).json({ error: 'Invalid attempt type. Must be "failed" or "success".' });
    }

    // Record the attempt
    const id = uuidv4();
    await db.prepare(`
      INSERT INTO wallet_pin_attempts (id, user_id, successful, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `).run(id, userId, type === 'success' ? 1 : 0, ip, userAgent);

    // If success, also clear old failed attempts (they're no longer relevant)
    if (type === 'success') {
      // Delete failed attempts older than 1 hour to keep table clean
      await db.prepare(`
        DELETE FROM wallet_pin_attempts 
        WHERE user_id = $1 AND successful = 0 
        AND created_at < NOW() - INTERVAL '1 hour'
      `).run(userId);
    }

    // Return current rate limit status
    const status = await checkPinRateLimit(userId);
    res.json({ success: true, ...status });
  } catch (err) {
    console.error('Wallet PIN attempt error:', err);
    res.status(500).json({ error: 'Failed to record PIN attempt' });
  }
});

// GET /api/wallet/pin-status - Check current PIN rate limit status
router.get('/pin-status', async (req, res) => {
  try {
    const status = await checkPinRateLimit(req.user.id);
    res.json(status);
  } catch (err) {
    console.error('Wallet PIN status error:', err);
    res.status(500).json({ error: 'Failed to check PIN status' });
  }
});

// GET /api/wallet/overview - Get wallet balance and summary
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;

    // Calculate total earned (released payments as freelancer)
    const earned = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE freelancer_id = ? AND status = 'released'
    `).get(userId);

    // Calculate total spent (released payments as client)
    const spent = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE client_id = ? AND status = 'released'
    `).get(userId);

    // Calculate amount in escrow
    const inEscrow = await db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM transactions 
      WHERE (freelancer_id = ? OR client_id = ?) AND status = 'escrow'
    `).get(userId, userId);

    // Get pending orders count
    const pendingOrders = await db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE (client_id = ? OR freelancer_id = ?) AND status = 'pending'
    `).get(userId, userId);

    // Get active orders count
    const activeOrders = await db.prepare(`
      SELECT COUNT(*) as count FROM orders 
      WHERE (client_id = ? OR freelancer_id = ?) AND status IN ('accepted', 'in_progress', 'delivered')
    `).get(userId, userId);

    res.json({
      balance: earned.total - spent.total,
      earned: earned.total,
      spent: spent.total,
      inEscrow: inEscrow.total,
      pendingOrders: pendingOrders.count,
      activeOrders: activeOrders.count,
    });
  } catch (err) {
    console.error('Wallet overview error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet overview' });
  }
});

// GET /api/wallet/transactions - Get wallet transactions
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit, offset, status } = req.query;

    let query = `
      SELECT t.*, COALESCE(j.title, 'Wallet Top-up') as job_title,
        u_client.full_name as client_name,
        u_freelancer.full_name as freelancer_name
      FROM transactions t
      LEFT JOIN jobs j ON t.job_id = j.id
      JOIN users u_client ON t.client_id = u_client.id
      JOIN users u_freelancer ON t.freelancer_id = u_freelancer.id
      WHERE (t.client_id = ? OR t.freelancer_id = ?)
    `;
    const params = [userId, userId];

    if (status && status !== 'all') {
      query += ' AND t.status = ?';
      params.push(status);
    }

    query += ' ORDER BY t.created_at DESC';

    if (limit) {
      query += ' LIMIT ?';
      params.push(parseInt(limit));
    }
    if (offset) {
      query += ' OFFSET ?';
      params.push(parseInt(offset));
    }

    const transactions = await db.prepare(query).all(...params);
    res.json({ transactions });
  } catch (err) {
    console.error('Wallet transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

module.exports = router;
