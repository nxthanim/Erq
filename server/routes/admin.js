const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticate, authorize('admin'));

// Helper: translate range param to SQL date expression
function rangeToDate(range) {
  if (range === '7d') return "NOW() - INTERVAL '7 days'";
  if (range === '30d') return "NOW() - INTERVAL '30 days'";
  if (range === '12m') return "NOW() - INTERVAL '12 months'";
  return '1970-01-01'; // all
}

// GET /api/admin/stats - Platform statistics
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
    const totalFreelancers = (await db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('freelancer')).count;
    const totalClients = (await db.prepare('SELECT COUNT(*) as count FROM users WHERE role = ?').get('client')).count;
    const totalGigs = (await db.prepare('SELECT COUNT(*) as count FROM gigs WHERE active = 1').get()).count;
    const totalJobs = (await db.prepare('SELECT COUNT(*) as count FROM jobs').get()).count;
    const openJobs = (await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('open')).count;
    const completedJobs = (await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE status = ?').get('completed')).count;
    const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = ?").get('released')).total;
    const escrowBalance = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = ?").get('escrow')).total;
    const pendingDisputes = (await db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = ?").get('disputed')).count;

    res.json({
      stats: {
        totalUsers, totalFreelancers, totalClients,
        totalGigs, totalJobs, openJobs, completedJobs,
        totalRevenue, escrowBalance, pendingDisputes
      }
    });
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const users = await db.prepare('SELECT id, email, full_name, role, phone, city, verified, rating, review_count, created_at FROM users ORDER BY created_at DESC').all();
    res.json({ users });
  } catch (err) {
    console.error('Error listing users:', err);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

// PUT /api/admin/users/:id/verify - Toggle freelancer verification
router.put('/users/:id/verify', async (req, res) => {
  try {
    const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newStatus = user.verified ? 0 : 1;
    await db.prepare('UPDATE users SET verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newStatus, req.params.id);

    const notifId = uuidv4();
    const message = newStatus ? 'Your account has been verified!' : 'Your verification has been removed.';
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, req.params.id, 'Verification Update', message, 'info');

    res.json({ verified: !!newStatus, message });
  } catch (err) {
    console.error('Error verifying user:', err);
    res.status(500).json({ error: 'Failed to update verification' });
  }
});

// GET /api/admin/gigs - List all gigs
router.get('/gigs', async (req, res) => {
  try {
    const gigs = await db.prepare(`
      SELECT g.*, u.full_name as freelancer_name, u.email as freelancer_email
      FROM gigs g JOIN users u ON g.freelancer_id = u.id ORDER BY g.created_at DESC
    `).all();
    res.json({ gigs });
  } catch (err) {
    console.error('Error listing gigs:', err);
    res.status(500).json({ error: 'Failed to list gigs' });
  }
});

// GET /api/admin/jobs - List all jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await db.prepare(`
      SELECT j.*, u.full_name as client_name, u2.full_name as freelancer_name
      FROM jobs j 
      JOIN users u ON j.client_id = u.id 
      LEFT JOIN users u2 ON j.awarded_to = u2.id
      ORDER BY j.created_at DESC
    `).all();
    res.json({ jobs });
  } catch (err) {
    console.error('Error listing jobs:', err);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// GET /api/admin/transactions - List all transactions
router.get('/transactions', async (req, res) => {
  try {
    const transactions = await db.prepare(`
      SELECT t.*, j.title as job_title, u1.full_name as client_name, u2.full_name as freelancer_name
      FROM transactions t
      JOIN jobs j ON t.job_id = j.id
      JOIN users u1 ON t.client_id = u1.id
      JOIN users u2 ON t.freelancer_id = u2.id
      ORDER BY t.created_at DESC
    `).all();
    res.json({ transactions });
  } catch (err) {
    console.error('Error listing transactions:', err);
    res.status(500).json({ error: 'Failed to list transactions' });
  }
});

// PUT /api/admin/disputes/:transactionId/resolve - Resolve a dispute
router.put('/disputes/:transactionId/resolve', async (req, res) => {
  try {
    const { action } = req.body;
    const transaction = await db.prepare('SELECT * FROM transactions WHERE id = ? AND status = ?').get(req.params.transactionId, 'disputed');
    if (!transaction) return res.status(404).json({ error: 'Disputed transaction not found' });

    if (action === 'release' || action === 'refund') {
      await db.prepare("UPDATE transactions SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
        .run(action === 'release' ? 'released' : 'refunded', req.params.transactionId);

      const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(transaction.job_id);
      const msg = action === 'release'
        ? `Dispute resolved: Payment of ETB ${transaction.amount} has been released to the freelancer.`
        : `Dispute resolved: Payment of ETB ${transaction.amount} has been refunded to the client.`;

      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), transaction.client_id, 'Dispute Resolved', msg, 'info');
      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), transaction.freelancer_id, 'Dispute Resolved', msg, 'info');

      res.json({ success: true, message: msg });
    } else {
      res.status(400).json({ error: 'Action must be "release" or "refund"' });
    }
  } catch (err) {
    console.error('Error resolving dispute:', err);
    res.status(500).json({ error: 'Failed to resolve dispute' });
  }
});

// ====== ANALYTICS ENDPOINTS ======

// GET /api/admin/analytics/financial?range=30d - Financial analytics with time range
router.get('/analytics/financial', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as revenue
      FROM transactions WHERE status = 'released' AND ${dateCond}
      GROUP BY month ORDER BY month ASC
    `).all();

    const dailyBalance = db.prepare(`
      SELECT date(created_at) as day,
        SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as released,
        SUM(CASE WHEN status = 'escrow' THEN amount ELSE 0 END) as escrow
      FROM transactions WHERE ${dateCond} GROUP BY day ORDER BY day ASC
    `).all();

    const topCategories = db.prepare(`
      SELECT j.category, COUNT(*) as count, COALESCE(SUM(t.amount), 0) as total_revenue
      FROM transactions t JOIN jobs j ON t.job_id = j.id
      WHERE t.status = 'released' GROUP BY j.category ORDER BY total_revenue DESC LIMIT 5
    `).all();

    const topFreelancers = db.prepare(`
      SELECT u.full_name, COUNT(*) as jobs_completed, COALESCE(SUM(t.amount), 0) as total_earned, u.rating, u.profile_picture
      FROM transactions t JOIN users u ON t.freelancer_id = u.id
      WHERE t.status = 'released' GROUP BY u.id ORDER BY total_earned DESC LIMIT 5
    `).all();

    const mrr = db.prepare(`SELECT COALESCE(SUM(amount), 0) as mrr FROM transactions WHERE status = 'released' AND created_at >= date('now', '-30 days')`).get().mrr;
    const arr = mrr * 12;

    const growthRate = db.prepare(`
      SELECT COALESCE(
        (SELECT SUM(amount) FROM transactions WHERE status = 'released' AND created_at >= date('now', '-30 days')) -
        (SELECT SUM(amount) FROM transactions WHERE status = 'released' AND created_at >= date('now', '-60 days') AND created_at < date('now', '-30 days'))
      , 0) as growth
    `).get();

    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT client_id as user_id FROM jobs WHERE created_at >= date('now', '-30 days')
        UNION SELECT freelancer_id FROM gigs WHERE created_at >= date('now', '-30 days')
        UNION SELECT sender_id FROM messages WHERE created_at >= date('now', '-30 days')
      )
    `).get().count;

    const escrowBalance = db.prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE status = ?").get('escrow').balance;

    res.json({
      analytics: {
        mrr: Math.round(mrr), arr: Math.round(arr),
        growthRate: Math.round((growthRate?.growth || 0) * 100) / 100,
        activeUsers, escrowBalance: Math.round(escrowBalance),
        monthlyRevenue, dailyBalance, topCategories, topFreelancers
      }
    });
  } catch (err) {
    console.error('Error fetching financial analytics:', err);
    res.status(500).json({ error: 'Failed to fetch financial analytics' });
  }
});

// GET /api/admin/analytics/messages?range=30d - Message analytics
router.get('/analytics/messages', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalMessages = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE ${dateCond}`).get().count;
    const unreadMessages = db.prepare(`SELECT COUNT(*) as count FROM messages WHERE read = 0 AND ${dateCond}`).get().count;
    const activeConversations = db.prepare(`
      SELECT COUNT(*) as count FROM (SELECT sender_id, receiver_id FROM messages WHERE ${dateCond} GROUP BY sender_id, receiver_id)
    `).get().count;

    const monthlyVolume = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM messages WHERE ${dateCond} GROUP BY month ORDER BY month ASC
    `).all();

    const topConversations = db.prepare(`
      SELECT u1.full_name as user1, u2.full_name as user2, COUNT(*) as msg_count, MAX(m.created_at) as last_msg
      FROM messages m JOIN users u1 ON m.sender_id = u1.id JOIN users u2 ON m.receiver_id = u2.id
      WHERE ${dateCond} GROUP BY m.sender_id, m.receiver_id ORDER BY msg_count DESC LIMIT 5
    `).all();

    res.json({
      analytics: {
        totalMessages, unreadMessages, activeConversations,
        monthlyVolume, topConversations
      }
    });
  } catch (err) {
    console.error('Error fetching message analytics:', err);
    res.status(500).json({ error: 'Failed to fetch message analytics' });
  }
});

// GET /api/admin/analytics/platform?range=30d - Platform overview
router.get('/analytics/platform', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const totalFreelancers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = ?").get('freelancer').count;
    const totalClients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = ?").get('client').count;
    const totalGigs = db.prepare('SELECT COUNT(*) as count FROM gigs WHERE active = 1').get().count;
    const totalJobs = db.prepare('SELECT COUNT(*) as count FROM jobs').get().count;
    const openJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = ?").get('open').count;
    const completedJobs = db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = ?").get('completed').count;

    const userGrowth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM users WHERE ${dateCond} GROUP BY month ORDER BY month ASC
    `).all();

    const gigGrowth = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM gigs WHERE ${dateCond} GROUP BY month ORDER BY month ASC
    `).all();

    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 1000) / 10 : 0;

    res.json({
      analytics: {
        totalUsers, totalFreelancers, totalClients,
        totalGigs, totalJobs, openJobs, completedJobs,
        completionRate, userGrowth, gigGrowth
      }
    });
  } catch (err) {
    console.error('Error fetching platform analytics:', err);
    res.status(500).json({ error: 'Failed to fetch platform analytics' });
  }
});

// GET /api/admin/analytics/payments?range=30d - Payment & escrow analytics
router.get('/analytics/payments', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalEscrow = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'escrow' AND ${dateCond}`).get().total;
    const totalReleased = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'released' AND ${dateCond}`).get().total;
    const totalRefunded = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'refunded' AND ${dateCond}`).get().total;
    const transactionCount = db.prepare(`SELECT COUNT(*) as count FROM transactions WHERE ${dateCond}`).get().count;

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count, COALESCE(SUM(amount), 0) as total
      FROM transactions WHERE ${dateCond} GROUP BY status
    `).all();

    const recentTransactions = db.prepare(`
      SELECT t.*, j.title as job_title, u1.full_name as client_name, u2.full_name as freelancer_name
      FROM transactions t JOIN jobs j ON t.job_id = j.id
      JOIN users u1 ON t.client_id = u1.id JOIN users u2 ON t.freelancer_id = u2.id
      WHERE ${dateCond} ORDER BY t.created_at DESC LIMIT 5
    `).all();

    const monthlyVolume = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count, COALESCE(SUM(amount), 0) as volume
      FROM transactions WHERE ${dateCond} GROUP BY month ORDER BY month ASC
    `).all();

    res.json({
      analytics: {
        totalEscrow: Math.round(totalEscrow), totalReleased: Math.round(totalReleased),
        totalRefunded: Math.round(totalRefunded), transactionCount,
        statusBreakdown, recentTransactions, monthlyVolume
      }
    });
  } catch (err) {
    console.error('Error fetching payment analytics:', err);
    res.status(500).json({ error: 'Failed to fetch payment analytics' });
  }
});

// GET /api/admin/analytics/disputes?range=30d - Dispute & review analytics
router.get('/analytics/disputes', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const totalDisputes = db.prepare(`SELECT COUNT(*) as count FROM disputes WHERE ${dateCond}`).get().count;
    const pendingDisputes = db.prepare(`SELECT COUNT(*) as count FROM disputes WHERE status IN ('pending','under_review') AND ${dateCond}`).get().count;

    const statusBreakdown = db.prepare(`
      SELECT status, COUNT(*) as count FROM disputes WHERE ${dateCond} GROUP BY status
    `).all();

    const avgRating = db.prepare(`
      SELECT COALESCE(AVG(rating), 0) as avg_rating, COUNT(*) as total_reviews
      FROM reviews WHERE ${dateCond}
    `).get();

    const ratingDistribution = db.prepare(`
      SELECT rating, COUNT(*) as count FROM reviews WHERE ${dateCond} GROUP BY rating ORDER BY rating DESC
    `).all();

    const rangeDate = rangeToDate(range);
    const recentDisputes = db.prepare(`
      SELECT d.*, j.title as job_title, u1.full_name as raised_by_name
      FROM disputes d JOIN transactions t ON d.transaction_id = t.id
      JOIN jobs j ON t.job_id = j.id JOIN users u1 ON d.raised_by = u1.id
      WHERE d.created_at >= ${rangeDate}
      ORDER BY d.created_at DESC LIMIT 5
    `).all();

    res.json({
      analytics: {
        totalDisputes, pendingDisputes,
        resolvedDisputes: totalDisputes - pendingDisputes,
        statusBreakdown,
        avgRating: Math.round(avgRating.avg_rating * 10) / 10,
        totalReviews: avgRating.total_reviews,
        ratingDistribution, recentDisputes
      }
    });
  } catch (err) {
    console.error('Error fetching dispute analytics:', err);
    res.status(500).json({ error: 'Failed to fetch dispute analytics' });
  }
});

// GET /api/admin/analytics/referrals - Referral analytics
router.get('/analytics/referrals', (req, res) => {
  try {
    const totalReferrals = db.prepare('SELECT COUNT(*) as count FROM referrals').get().count;
    const totalSignups = db.prepare('SELECT COALESCE(SUM(total_signups), 0) as count FROM referrals').get().count;

    res.json({
      analytics: { totalReferrals, totalSignups }
    });
  } catch (err) {
    console.error('Error fetching referral analytics:', err);
    res.status(500).json({ error: 'Failed to fetch referral analytics' });
  }
});

// GET /api/admin/analytics?range=30d - Legacy: Detailed financial analytics (backwards compatible)
router.get('/analytics', (req, res) => {
  try {
    const range = req.query.range || '30d';
    const dateCond = `created_at >= ${rangeToDate(range)}`;

    const monthlyRevenue = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(amount), 0) as revenue
      FROM transactions WHERE status = 'released' AND created_at >= date('now', '-12 months')
      GROUP BY month ORDER BY month ASC
    `).all();

    const dailyBalance = db.prepare(`
      SELECT date(created_at) as day,
        SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as released,
        SUM(CASE WHEN status = 'escrow' THEN amount ELSE 0 END) as escrow
      FROM transactions WHERE created_at >= date('now', '-30 days')
      GROUP BY day ORDER BY day ASC
    `).all();

    const topCategories = db.prepare(`
      SELECT j.category, COUNT(*) as count, COALESCE(SUM(t.amount), 0) as total_revenue
      FROM transactions t JOIN jobs j ON t.job_id = j.id
      WHERE t.status = 'released' GROUP BY j.category ORDER BY total_revenue DESC LIMIT 5
    `).all();

    const topFreelancers = db.prepare(`
      SELECT u.full_name, COUNT(*) as jobs_completed, COALESCE(SUM(t.amount), 0) as total_earned, u.rating, u.profile_picture
      FROM transactions t JOIN users u ON t.freelancer_id = u.id
      WHERE t.status = 'released' GROUP BY u.id ORDER BY total_earned DESC LIMIT 5
    `).all();

    const growthRate = db.prepare(`
      SELECT COALESCE(
        (SELECT SUM(amount) FROM transactions WHERE status = 'released' AND created_at >= date('now', '-30 days')) -
        (SELECT SUM(amount) FROM transactions WHERE status = 'released' AND created_at >= date('now', '-60 days') AND created_at < date('now', '-30 days'))
      , 0) as growth
    `).get();

    const mrr = db.prepare(`SELECT COALESCE(SUM(amount), 0) as mrr FROM transactions WHERE status = 'released' AND created_at >= date('now', '-30 days')`).get().mrr;
    const arr = mrr * 12;

    const activeUsers = db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count FROM (
        SELECT client_id as user_id FROM jobs WHERE created_at >= date('now', '-30 days')
        UNION SELECT freelancer_id FROM gigs WHERE created_at >= date('now', '-30 days')
        UNION SELECT sender_id FROM messages WHERE created_at >= date('now', '-30 days')
      )
    `).get().count;

    res.json({
      analytics: {
        mrr: Math.round(mrr), arr: Math.round(arr),
        growthRate: Math.round((growthRate?.growth || 0) * 100) / 100,
        activeUsers,
        escrowBalance: Math.round(db.prepare("SELECT COALESCE(SUM(amount), 0) as balance FROM transactions WHERE status = ?").get('escrow').balance),
        monthlyRevenue, dailyBalance, topCategories, topFreelancers
      }
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ====== REVIEWS MANAGEMENT ======

// GET /api/admin/reviews - Get all reviews with reviewer/reviewee info
router.get('/reviews', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const reviews = db.prepare(`
      SELECT r.*,
        reviewer.full_name as reviewer_name,
        reviewer.email as reviewer_email,
        reviewer.profile_picture as reviewer_picture,
        reviewee.full_name as reviewee_name,
        reviewee.email as reviewee_email,
        reviewee.profile_picture as reviewee_picture
      FROM reviews r
      JOIN users reviewer ON r.reviewer_id = reviewer.id
      JOIN users reviewee ON r.reviewee_id = reviewee.id
      ORDER BY r.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM reviews').get().count;

    // Rating distribution stats
    const ratingDistribution = db.prepare(`
      SELECT rating, COUNT(*) as count FROM reviews GROUP BY rating ORDER BY rating DESC
    `).all();

    const avgRating = db.prepare('SELECT COALESCE(AVG(rating), 0) as avg FROM reviews').get().avg;

    res.json({ reviews, total, page, limit, ratingDistribution, avgRating: Math.round(avgRating * 10) / 10 });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// DELETE /api/admin/reviews/:id - Delete a review (admin action)
router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    // Delete the review
    await db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);

    // Recalculate the reviewee's rating
    const stats = await db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?').get(review.reviewee_id);
    await db.prepare('UPDATE users SET rating = ROUND(?, 1), review_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stats.avg_rating || 0, stats.count, review.reviewee_id);

    // Notify the reviewee about the removal
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, review.reviewee_id, 'Review Removed by Admin',
        `A review from ${review.reviewer_id.slice(0, 8)}... has been removed by an admin. Your rating has been recalculated.`,
        'info');

    console.log(`🗑️ Admin ${req.user.id} deleted review ${req.params.id} (reviewee: ${review.reviewee_id.slice(0, 8)})`);

    res.json({ success: true, message: 'Review deleted. User rating recalculated.' });
  } catch (err) {
    console.error('Error deleting review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

// GET /api/admin/biometric-evidence - Get all biometric payment confirmations with evidence
router.get('/biometric-evidence', (req, res) => {
  try {
    const evidence = db.prepare(`
      SELECT 
        t.id as transaction_id,
        t.amount,
        t.status,
        t.confirmation_selfie,
        t.confirmation_audio,
        t.confirmed_at,
        t.created_at as transaction_created_at,
        j.id as job_id,
        j.title as job_title,
        j.status as job_status,
        u_freelancer.id as freelancer_id,
        u_freelancer.full_name as freelancer_name,
        u_freelancer.email as freelancer_email,
        u_freelancer.phone as freelancer_phone,
        u_freelancer.profile_picture as freelancer_picture,
        u_client.id as client_id,
        u_client.full_name as client_name,
        u_client.email as client_email
      FROM transactions t
      JOIN jobs j ON t.job_id = j.id
      JOIN users u_freelancer ON t.freelancer_id = u_freelancer.id
      JOIN users u_client ON t.client_id = u_client.id
      WHERE t.status = 'confirmed' AND t.confirmation_selfie IS NOT NULL
      ORDER BY t.confirmed_at DESC
    `).all();

    res.json({ evidence });
  } catch (err) {
    console.error('Error fetching biometric evidence:', err);
    res.status(500).json({ error: 'Failed to fetch biometric evidence' });
  }
});

// GET /api/admin/notifications - Get latest notifications
router.get('/notifications', (req, res) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    res.json({ notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/admin/audit/login - Get login audit trail
router.get('/audit/login', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const audits = db.prepare(`
      SELECT la.*, u.full_name, u.email as user_email
      FROM login_audit la
      LEFT JOIN users u ON la.user_id = u.id
      ORDER BY la.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM login_audit').get().count;

    res.json({ audits, total, page, limit });
  } catch (err) {
    console.error('Error fetching login audit:', err);
    res.status(500).json({ error: 'Failed to fetch login audit' });
  }
});

// GET /api/admin/audit/payment - Get payment audit trail
router.get('/audit/payment', (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    const audits = db.prepare(`
      SELECT pa.*, u.full_name, u.email as user_email
      FROM payment_audit pa
      LEFT JOIN users u ON pa.user_id = u.id
      ORDER BY pa.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM payment_audit').get().count;

    res.json({ audits, total, page, limit });
  } catch (err) {
    console.error('Error fetching payment audit:', err);
    res.status(500).json({ error: 'Failed to fetch payment audit' });
  }
});

module.exports = router;
