const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All user analytics routes require authentication (no admin restriction)
router.use(authenticate);

// Helper: translate range param to SQL date expression
function rangeToDate(range) {
  if (range === '7d') return "NOW() - INTERVAL '7 days'";
  if (range === '30d') return "NOW() - INTERVAL '30 days'";
  if (range === '12m') return "NOW() - INTERVAL '12 months'";
  return '1970-01-01'; // all
}

// GET /api/user/analytics/overview?range=30d - Personal analytics overview
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    // For freelancers: gigs, earnings, messages
    // For clients: jobs, spent, messages
    // For admin: same as admin analytics (full platform view)
    if (req.user.role === 'admin') {
      // Admin sees platform overview as before
      const totalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
      const totalFreelancers = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = ?").get('freelancer')).count;
      const totalClients = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = ?").get('client')).count;
      const totalGigs = (await db.prepare('SELECT COUNT(*) as count FROM gigs WHERE active = 1').get()).count;
      const totalJobs = (await db.prepare('SELECT COUNT(*) as count FROM jobs').get()).count;
      const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'released'").get()).total;
      const escrowBalance = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE status = 'escrow'").get()).balance;

      const monthlyRevenue = await db.prepare(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COALESCE(SUM(amount), 0) as revenue
        FROM transactions WHERE status = 'released' AND ${dateCond}
        GROUP BY month ORDER BY month ASC
      `).all();

      const userGrowth = await db.prepare(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM users WHERE ${dateCond} GROUP BY month ORDER BY month ASC
      `).all();

      res.json({
        analytics: {
          role: 'admin',
          totalUsers, totalFreelancers, totalClients,
          totalGigs, totalJobs,
          totalRevenue: Math.round(totalRevenue),
          escrowBalance: Math.round(escrowBalance),
          monthlyRevenue, userGrowth,
        }
      });
      return;
    }

    // ====== CLIENT OVERVIEW ======
    if (req.user.role === 'client') {
      const totalJobs = (await db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND created_at >= ${rangeToDate(req.query.range || '30d')}`).get(userId)).count;
      const openJobs = (await db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'open' AND created_at >= ${rangeToDate(req.query.range || '30d')}`).get(userId)).count;
      const completedJobs = (await db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'completed' AND created_at >= ${rangeToDate(req.query.range || '30d')}`).get(userId)).count;
      const inProgressJobs = (await db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'in_progress' AND created_at >= ${rangeToDate(req.query.range || '30d')}`).get(userId)).count;

      const totalSpent = (await db.prepare(`
        SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
        WHERE t.client_id = ? AND t.status = 'released' AND t.created_at >= ${rangeToDate(req.query.range || '30d')}
      `).get(userId)).total;

      const avgBidsPerJob = (await db.prepare(`
        SELECT COALESCE(AVG(bid_count), 0) as avg FROM (
          SELECT COUNT(*) as bid_count FROM bids b JOIN jobs j ON b.job_id = j.id
          WHERE j.client_id = ? AND j.created_at >= ${rangeToDate(req.query.range || '30d')}
          GROUP BY b.job_id
        )
      `).get(userId)).avg;

      const recentJobs = await db.prepare(`
        SELECT j.*, (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count,
          (SELECT full_name FROM users WHERE id = j.awarded_to) as freelancer_name
        FROM jobs j WHERE j.client_id = ? AND j.created_at >= ${rangeToDate(req.query.range || '30d')}
        ORDER BY j.created_at DESC LIMIT 10
      `).all(userId);

      // Message stats
      const totalMessages = (await db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND created_at >= ${rangeToDate(req.query.range || '30d')}
      `).get(userId, userId)).count;
      const unreadMessages = (await db.prepare(`
        SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0
      `).get(userId)).count;
      const activeConversations = (await db.prepare(`
        SELECT COUNT(DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END) as count
        FROM messages WHERE (sender_id = ? OR receiver_id = ?)
      `).get(userId, userId, userId)).count;

      res.json({
        analytics: {
          role: 'client',
          totalJobs, openJobs, completedJobs, inProgressJobs,
          totalSpent: Math.round(totalSpent),
          avgBidsPerJob: Math.round(avgBidsPerJob * 10) / 10,
          recentJobs,
          totalMessages, unreadMessages, activeConversations,
        }
      });
      return;
    }

    // ====== FREELANCER OVERVIEW ======
    const totalGigs = (await db.prepare('SELECT COUNT(*) as count FROM gigs WHERE freelancer_id = ?').get(userId)).count;
    const activeGigs = (await db.prepare('SELECT COUNT(*) as count FROM gigs WHERE freelancer_id = ? AND active = 1').get(userId)).count;
    const totalEarned = (await db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
      JOIN jobs j ON t.job_id = j.id WHERE j.awarded_to = ? AND t.status = 'released'
    `).get(userId)).total;
    const escrowHeld = (await db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
      JOIN jobs j ON t.job_id = j.id WHERE j.awarded_to = ? AND t.status = 'escrow'
    `).get(userId)).total;
    const totalBids = (await db.prepare('SELECT COUNT(*) as count FROM bids WHERE freelancer_id = ?').get(userId)).count;
    const wonBids = (await db.prepare('SELECT COUNT(*) as count FROM bids WHERE freelancer_id = ? AND status = ?').get(userId, 'accepted')).count;

    const completedJobs = (await db.prepare(`
      SELECT COUNT(*) as count FROM jobs WHERE awarded_to = ? AND status = 'completed'
    `).get(userId)).count;

    const avgRating = (await db.prepare(`
      SELECT COALESCE(AVG(rating), 0) as avg FROM reviews WHERE reviewee_id = ?
    `).get(userId)).avg;

    const totalReviews = (await db.prepare(`
      SELECT COUNT(*) as count FROM reviews WHERE reviewee_id = ?
    `).get(userId)).count;

    // Monthly earnings chart
    const monthlyEarnings = await db.prepare(`
      SELECT TO_CHAR(t.created_at, 'YYYY-MM') as month, COALESCE(SUM(t.amount), 0) as amount
      FROM transactions t JOIN jobs j ON t.job_id = j.id
      WHERE j.awarded_to = ? AND t.status = 'released' AND t.created_at >= ${rangeToDate(req.query.range || '30d')}
      GROUP BY month ORDER BY month ASC
    `).all(userId);

    const recentJobs = await db.prepare(`
      SELECT j.id, j.title, j.status, j.budget_max, j.created_at, u.full_name as client_name
      FROM jobs j JOIN users u ON j.client_id = u.id
      WHERE j.awarded_to = ? ORDER BY j.created_at DESC LIMIT 10
    `).all(userId);

    // Message stats
    const totalMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND ${dateCond}
    `).get(userId, userId).count;

    const unreadMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0
    `).get(userId).count;

    const activeConversations = db.prepare(`
      SELECT COUNT(DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END) as count
      FROM messages WHERE (sender_id = ? OR receiver_id = ?)
    `).get(userId, userId, userId).count;

    res.json({
      analytics: {
        role: 'freelancer',
        totalGigs, activeGigs,
        totalEarned: Math.round(totalEarned),
        escrowHeld: Math.round(escrowHeld),
        totalBids, wonBids, winRate: totalBids > 0 ? Math.round((wonBids / totalBids) * 100) : 0,
        completedJobs,
        avgRating: Math.round(avgRating * 10) / 10,
        totalReviews,
        monthlyEarnings,
        recentJobs,
        totalMessages, unreadMessages, activeConversations,
      }
    });
  } catch (err) {
    console.error('Error fetching user analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/user/analytics/gigs?range=30d - User's gig performance analytics
router.get('/gigs', (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const gigs = db.prepare(`
      SELECT g.*, 
        (SELECT COUNT(*) FROM reviews WHERE gig_id = g.id) as review_count,
        (SELECT COALESCE(AVG(rating), 0) FROM reviews WHERE gig_id = g.id) as avg_rating
      FROM gigs g WHERE g.freelancer_id = ? AND ${dateCond.replace(/created_at/g, 'g.created_at')}
      ORDER BY g.created_at DESC
    `).all(userId);

    const totalViews = gigs.reduce((s, g) => s + (g.views || 0), 0);
    const avgGigRating = gigs.length > 0 ? Math.round((gigs.reduce((s, g) => s + (g.avg_rating || 0), 0) / gigs.length) * 10) / 10 : 0;

    res.json({
      analytics: {
        totalGigs: gigs.length,
        totalViews,
        avgGigRating,
        gigs
      }
    });
  } catch (err) {
    console.error('Error fetching gig analytics:', err);
    res.status(500).json({ error: 'Failed to fetch gig analytics' });
  }
});

// GET /api/user/analytics/earnings?range=30d - Earnings breakdown
router.get('/earnings', (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const earnings = db.prepare(`
      SELECT t.*, j.title as job_title, u.full_name as client_name, j.category
      FROM transactions t JOIN jobs j ON t.job_id = j.id JOIN users u ON j.client_id = u.id
      WHERE (j.awarded_to = ? OR t.freelancer_id = ?) AND t.status = 'released'
      AND ${dateCond.replace('created_at', 't.created_at')}
      ORDER BY t.created_at DESC
    `).all(userId, userId);

    const totalEarned = earnings.reduce((s, e) => s + (e.amount || 0), 0);

    // Category breakdown
    const categoryBreakdown = {};
    earnings.forEach(e => {
      const cat = e.category || 'Other';
      if (!categoryBreakdown[cat]) categoryBreakdown[cat] = 0;
      categoryBreakdown[cat] += e.amount || 0;
    });

    res.json({
      analytics: {
        totalEarned: Math.round(totalEarned),
        totalTransactions: earnings.length,
        categoryBreakdown,
        recentEarnings: earnings.slice(0, 10)
      }
    });
  } catch (err) {
    console.error('Error fetching earnings analytics:', err);
    res.status(500).json({ error: 'Failed to fetch earnings analytics' });
  }
});

// GET /api/user/analytics/messages?range=30d - User's messaging analytics
router.get('/messages', (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND ${dateCond}
    `).get(userId, userId).count;

    const sentMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE sender_id = ? AND ${dateCond}
    `).get(userId).count;

    const receivedMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND ${dateCond}
    `).get(userId).count;

    const unreadMessages = db.prepare(`
      SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0
    `).get(userId).count;

    const conversations = db.prepare(`
      SELECT DISTINCT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as peer_id
      FROM messages WHERE (sender_id = ? OR receiver_id = ?)
    `).all(userId, userId, userId);

    let monthlyVolume = [];
    try {
      // SQLite uses strftime, PostgreSQL uses TO_CHAR - try both
      monthlyVolume = db.prepare(`
        SELECT TO_CHAR(created_at, 'YYYY-MM') as month, COUNT(*) as count
        FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND ${dateCond}
        GROUP BY month ORDER BY month ASC
      `).all(userId, userId);
    } catch {
      try {
        monthlyVolume = db.prepare(`
          SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
          FROM messages WHERE (sender_id = ? OR receiver_id = ?) AND ${dateCond}
          GROUP BY month ORDER BY month ASC
        `).all(userId, userId);
      } catch {
        monthlyVolume = [];
      }
    }

    // Top conversation partners
    const topConversations = db.prepare(`
      SELECT u.full_name as peer_name, COUNT(*) as msg_count, MAX(m.created_at) as last_msg
      FROM messages m JOIN users u ON (CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END) = u.id
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
      GROUP BY peer_name ORDER BY msg_count DESC LIMIT 5
    `).all(userId, userId, userId);

    res.json({
      analytics: {
        totalMessages, sentMessages, receivedMessages, unreadMessages,
        activeConversations: conversations.length,
        monthlyVolume, topConversations
      }
    });
  } catch (err) {
    console.error('Error fetching message analytics:', err);
    res.status(500).json({ error: 'Failed to fetch message analytics' });
  }
});

// GET /api/user/analytics/jobs?range=30d - Client's job analytics
router.get('/jobs', (req, res) => {
  try {
    const userId = req.user.id;
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND ${dateCond}`).get(userId).count;
    const openJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'open' AND ${dateCond}`).get(userId).count;
    const completedJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'completed' AND ${dateCond}`).get(userId).count;
    const inProgressJobs = db.prepare(`SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = 'in_progress' AND ${dateCond}`).get(userId).count;

    const totalSpent = db.prepare(`
      SELECT COALESCE(SUM(t.amount), 0) as total FROM transactions t
      WHERE t.client_id = ? AND t.status = 'released' AND ${dateCond.replace('created_at', 't.created_at')}
    `).get(userId).total;

    const avgBidsPerJob = db.prepare(`
      SELECT COALESCE(AVG(bid_count), 0) as avg FROM (
        SELECT COUNT(*) as bid_count FROM bids b JOIN jobs j ON b.job_id = j.id
        WHERE j.client_id = ? AND ${dateCond.replace(/created_at/g, 'j.created_at')}
        GROUP BY b.job_id
      )
    `).get(userId).avg;

    const recentJobs = db.prepare(`
      SELECT j.*, (SELECT COUNT(*) FROM bids WHERE job_id = j.id) as bid_count,
        (SELECT full_name FROM users WHERE id = j.awarded_to) as freelancer_name
      FROM jobs j WHERE j.client_id = ? AND ${dateCond}
      ORDER BY j.created_at DESC LIMIT 10
    `).all(userId);

    res.json({
      analytics: {
        totalJobs, openJobs, completedJobs, inProgressJobs,
        totalSpent: Math.round(totalSpent),
        avgBidsPerJob: Math.round(avgBidsPerJob * 10) / 10,
        recentJobs
      }
    });
  } catch (err) {
    console.error('Error fetching job analytics:', err);
    res.status(500).json({ error: 'Failed to fetch job analytics' });
  }
});

module.exports = router;
