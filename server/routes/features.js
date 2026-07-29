const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// ====== SAVED GIGS ======

// POST /api/features/saved-gigs/:gigId - Toggle save/unsave a gig
router.post('/saved-gigs/:gigId', authenticate, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT id FROM saved_gigs WHERE user_id = ? AND gig_id = ?').get(req.user.id, req.params.gigId);
    if (existing) {
      await db.prepare('DELETE FROM saved_gigs WHERE id = ?').run(existing.id);
      return res.json({ saved: false });
    }
    await db.prepare('INSERT INTO saved_gigs (id, user_id, gig_id) VALUES (?, ?, ?)').run(uuidv4(), req.user.id, req.params.gigId);
    res.json({ saved: true });
  } catch (err) {
    console.error('Error toggling saved gig:', err);
    res.status(500).json({ error: 'Failed to toggle saved gig' });
  }
});

// GET /api/features/saved-gigs - Get all saved gigs for current user
router.get('/saved-gigs', authenticate, async (req, res) => {
  try {
    const saved = await db.prepare(`
      SELECT sg.id as saved_id, sg.created_at as saved_at,
             g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating
      FROM saved_gigs sg
      JOIN gigs g ON sg.gig_id = g.id
      JOIN users u ON g.freelancer_id = u.id
      WHERE sg.user_id = ?
      ORDER BY sg.created_at DESC
    `).all(req.user.id);
    res.json({ saved });
  } catch (err) {
    console.error('Error fetching saved gigs:', err);
    res.status(500).json({ error: 'Failed to fetch saved gigs' });
  }
});

// GET /api/features/saved-gigs/check/:gigId - Check if a gig is saved
router.get('/saved-gigs/check/:gigId', authenticate, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT id FROM saved_gigs WHERE user_id = ? AND gig_id = ?').get(req.user.id, req.params.gigId);
    res.json({ saved: !!existing });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check saved gig' });
  }
});

// ====== NOTIFICATIONS ======

// GET /api/features/notifications - Get user's notifications
router.get('/notifications', authenticate, async (req, res) => {
  try {
    const notifications = await db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
    const unreadCount = await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(req.user.id);
    res.json({ notifications, unreadCount: unreadCount.count });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PUT /api/features/notifications/:id/read - Mark notification as read
router.put('/notifications/:id/read', authenticate, async (req, res) => {
  try {
    await db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/features/notifications/read-all - Mark all notifications as read
router.put('/notifications/read-all', authenticate, async (req, res) => {
  try {
    await db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0').run(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

// ====== DASHBOARD STATS ======

// GET /api/features/dashboard - Get dashboard stats for current user
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let stats = {
      unreadMessages: 0,
      unreadNotifications: 0,
      activeGigs: 0,
      activeJobs: 0,
      totalEarned: 0,
      totalSpent: 0,
      recentActivity: []
    };

    // Common stats
    stats.unreadMessages = (await db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = ? AND read = 0').get(userId)).count;
    stats.unreadNotifications = (await db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0').get(userId)).count;

    if (role === 'freelancer') {
      stats.activeGigs = (await db.prepare('SELECT COUNT(*) as count FROM gigs WHERE freelancer_id = ? AND active = 1').get(userId)).count;
      stats.totalEarned = (await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE freelancer_id = ? AND status = ?').get(userId, 'released')).total;
      
      // Recent bids
      const recentBids = await db.prepare(`
        SELECT b.*, j.title as job_title FROM bids b 
        JOIN jobs j ON b.job_id = j.id 
        WHERE b.freelancer_id = ? ORDER BY b.created_at DESC LIMIT 5
      `).all(userId);
      stats.recentActivity = recentBids.map(b => ({ ...b, type: 'bid' }));
    }

    if (role === 'client') {
      stats.activeJobs = (await db.prepare('SELECT COUNT(*) as count FROM jobs WHERE client_id = ? AND status = ?').get(userId, 'open')).count;
      stats.totalSpent = (await db.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE client_id = ? AND status = ?').get(userId, 'released')).total;
      
      // Recent jobs
      const recentJobs = await db.prepare(`
        SELECT * FROM jobs WHERE client_id = ? ORDER BY created_at DESC LIMIT 5
      `).all(userId);
      stats.recentActivity = recentJobs.map(j => ({ ...j, type: 'job' }));
    }

    if (role === 'admin') {
      stats.totalUsers = (await db.prepare('SELECT COUNT(*) as count FROM users').get()).count;
      stats.totalTransactions = (await db.prepare('SELECT COUNT(*) as count FROM transactions').get()).count;
      stats.pendingDisputes = (await db.prepare("SELECT COUNT(*) as count FROM transactions WHERE status = 'disputed'").get()).count;
    }

    res.json({ stats });
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// ====== SKILL BADGES ======

// GET /api/features/skill-badges/:userId - Get skill badges for a user
router.get('/skill-badges/:userId', async (req, res) => {
  try {
    const badges = await db.prepare('SELECT * FROM skill_badges WHERE user_id = ? AND (expires_at IS NULL OR expires_at > NOW()) ORDER BY issued_at DESC').all(req.params.userId);
    res.json({ badges });
  } catch (err) {
    console.error('Error fetching skill badges:', err);
    res.status(500).json({ error: 'Failed to fetch skill badges' });
  }
});

// POST /api/features/skill-badges - Assign a skill badge (admin only)
router.post('/skill-badges', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { userId, skill, badgeType } = req.body;
    if (!userId || !skill || !badgeType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const id = uuidv4();
    await db.prepare('INSERT INTO skill_badges (id, user_id, skill, badge_type) VALUES (?, ?, ?, ?)').run(id, userId, skill, badgeType);
    
    // Create notification for the user
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
      notifId, userId, 'Skill Badge Earned! 🏅', `You earned the "${badgeType.replace('_', ' ').toUpperCase()}" badge for "${skill}"!`, 'achievement'
    );
    
    const badge = await db.prepare('SELECT * FROM skill_badges WHERE id = ?').get(id);
    res.json({ badge });
  } catch (err) {
    console.error('Error assigning badge:', err);
    res.status(500).json({ error: 'Failed to assign badge' });
  }
});

// DELETE /api/features/skill-badges/:id - Remove a skill badge (admin only)
router.delete('/skill-badges/:id', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    await db.prepare('DELETE FROM skill_badges WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove badge' });
  }
});

// ====== DISPUTE RESOLUTION ======

// POST /api/features/disputes - Create a new dispute
router.post('/disputes', authenticate, async (req, res) => {
  try {
    const { transactionId, reason, description } = req.body;
    if (!transactionId || !reason) {
      return res.status(400).json({ error: 'Transaction ID and reason are required' });
    }

    // Verify user is part of this transaction
    const txn = await db.prepare('SELECT * FROM transactions WHERE id = ? AND (client_id = ? OR freelancer_id = ?)').get(transactionId, req.user.id, req.user.id);
    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    // Check if dispute already exists
    const existing = await db.prepare('SELECT id FROM disputes WHERE transaction_id = ? AND status IN (?, ?)').get(transactionId, 'pending', 'under_review');
    if (existing) {
      return res.status(400).json({ error: 'A dispute already exists for this transaction' });
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO disputes (id, transaction_id, raised_by, reason, description) VALUES (?, ?, ?, ?, ?)').run(id, transactionId, req.user.id, reason, description || '');

    // Update transaction status
    await db.prepare("UPDATE transactions SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(transactionId);

    // Notify admin
    const admins = await db.prepare("SELECT id FROM users WHERE role = 'admin'").all();
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(txn.job_id);
    for (const admin of admins) {
      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), admin.id, '🚨 New Dispute', `Dispute opened for "${job?.title}". Reason: ${reason}`, 'dispute'
      );
    }

    // Notify other party
    const otherUserId = req.user.id === txn.client_id ? txn.freelancer_id : txn.client_id;
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), otherUserId, '⚖️ Dispute Opened', `A dispute has been opened for "${job?.title}". Admin will review shortly.`, 'dispute'
    );

    const dispute = await db.prepare('SELECT * FROM disputes WHERE id = ?').get(id);
    res.status(201).json({ dispute });
  } catch (err) {
    console.error('Error creating dispute:', err);
    res.status(500).json({ error: 'Failed to create dispute' });
  }
});

// PUT /api/features/disputes/:id/evidence - Add evidence to a dispute
router.put('/disputes/:id/evidence', authenticate, async (req, res) => {
  try {
    const dispute = await db.prepare('SELECT * FROM disputes WHERE id = ? AND raised_by = ?').get(req.params.id, req.user.id);
    if (!dispute) {
      return res.status(404).json({ error: 'Dispute not found or unauthorized' });
    }
    if (dispute.status !== 'pending' && dispute.status !== 'under_review') {
      return res.status(400).json({ error: 'Cannot add evidence to a resolved dispute' });
    }

    const { evidence } = req.body; // array of evidence strings
    const existingEvidence = JSON.parse(dispute.evidence || '[]');
    const updatedEvidence = [...existingEvidence, ...(evidence || [])];
    
    await db.prepare('UPDATE disputes SET evidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(updatedEvidence), req.params.id);
    
    const updated = await db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
    res.json({ dispute: updated });
  } catch (err) {
    console.error('Error adding evidence:', err);
    res.status(500).json({ error: 'Failed to add evidence' });
  }
});

// PUT /api/features/disputes/:id/status - Admin: update dispute status
router.put('/disputes/:id/status', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' });
    }
    const { status, adminNotes } = req.body;
    const validStatuses = ['under_review', 'resolved_client', 'resolved_freelancer', 'resolved_split'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const dispute = await db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
    if (!dispute) return res.status(404).json({ error: 'Dispute not found' });

    await db.prepare('UPDATE disputes SET status = ?, admin_notes = COALESCE(?, admin_notes), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, adminNotes || null, req.params.id);

    // If resolved, update transaction
    if (status.startsWith('resolved_')) {
      const txn = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(dispute.transaction_id);
      if (txn) {
        if (status === 'resolved_client') {
          await db.prepare("UPDATE transactions SET status = 'refunded', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(dispute.transaction_id);
        } else if (status === 'resolved_freelancer') {
          await db.prepare("UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(dispute.transaction_id);
        } else if (status === 'resolved_split') {
          await db.prepare("UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(dispute.transaction_id);
        }
      }
    }

    // Notify both parties
    const txn = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(dispute.transaction_id);
    const job = await db.prepare('SELECT title FROM jobs WHERE id = ?').get(txn?.job_id);
    
    const involvedUsers = [dispute.raised_by];
    if (txn) {
      if (txn.client_id !== dispute.raised_by) involvedUsers.push(txn.client_id);
      if (txn.freelancer_id !== dispute.raised_by) involvedUsers.push(txn.freelancer_id);
    }

    for (const userId of involvedUsers) {
      await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
        uuidv4(), userId, '⚖️ Dispute Resolved', `The dispute for "${job?.title}" has been resolved. Status: ${status.replace(/_/g, ' ')}`, 'dispute'
      );
    }

    const updated = await db.prepare('SELECT * FROM disputes WHERE id = ?').get(req.params.id);
    res.json({ dispute: updated });
  } catch (err) {
    console.error('Error updating dispute:', err);
    res.status(500).json({ error: 'Failed to update dispute' });
  }
});

// GET /api/features/disputes - Get disputes (user sees own, admin sees all)
router.get('/disputes', authenticate, async (req, res) => {
  try {
    let disputes;
    if (req.user.role === 'admin') {
      disputes = await db.prepare(`
        SELECT d.*, t.amount, t.client_id, t.freelancer_id, j.title as job_title,
               u1.full_name as raised_by_name, u2.full_name as client_name, u3.full_name as freelancer_name
        FROM disputes d
        JOIN transactions t ON d.transaction_id = t.id
        JOIN jobs j ON t.job_id = j.id
        JOIN users u1 ON d.raised_by = u1.id
        JOIN users u2 ON t.client_id = u2.id
        JOIN users u3 ON t.freelancer_id = u3.id
        ORDER BY d.created_at DESC
      `).all();
    } else {
      disputes = await db.prepare(`
        SELECT d.*, t.amount, t.client_id, t.freelancer_id, j.title as job_title,
               u1.full_name as raised_by_name
        FROM disputes d
        JOIN transactions t ON d.transaction_id = t.id
        JOIN jobs j ON t.job_id = j.id
        JOIN users u1 ON d.raised_by = u1.id
        WHERE t.client_id = ? OR t.freelancer_id = ?
        ORDER BY d.created_at DESC
      `).all(req.user.id, req.user.id);
    }
    res.json({ disputes });
  } catch (err) {
    console.error('Error fetching disputes:', err);
    res.status(500).json({ error: 'Failed to fetch disputes' });
  }
});

// ====== PORTFOLIO GALLERY ======

// GET /api/features/portfolio/:userId - Get portfolio items for a user
router.get('/portfolio/:userId', async (req, res) => {
  try {
    const items = await db.prepare('SELECT * FROM portfolio_items WHERE user_id = ? ORDER BY created_at DESC').all(req.params.userId);
    const parsed = items.map(item => ({
      ...item,
      tags: JSON.parse(item.tags || '[]')
    }));
    res.json({ portfolio: parsed });
  } catch (err) {
    console.error('Error fetching portfolio:', err);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

// POST /api/features/portfolio - Add a portfolio item
router.post('/portfolio', authenticate, async (req, res) => {
  try {
    const { title, description, imageUrl, tags, category } = req.body;
    if (!title || !imageUrl) {
      return res.status(400).json({ error: 'Title and image URL are required' });
    }
    const id = uuidv4();
    await db.prepare('INSERT INTO portfolio_items (id, user_id, title, description, image_url, tags, category) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, title, description || '', imageUrl, JSON.stringify(tags || []), category || '');
    
    const item = await db.prepare('SELECT * FROM portfolio_items WHERE id = ?').get(id);
    res.status(201).json({ portfolio: { ...item, tags: JSON.parse(item.tags) } });
  } catch (err) {
    console.error('Error adding portfolio item:', err);
    res.status(500).json({ error: 'Failed to add portfolio item' });
  }
});

// DELETE /api/features/portfolio/:id - Delete a portfolio item
router.delete('/portfolio/:id', authenticate, async (req, res) => {
  try {
    const item = await db.prepare('SELECT * FROM portfolio_items WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!item) return res.status(404).json({ error: 'Portfolio item not found or unauthorized' });
    
    await db.prepare('DELETE FROM portfolio_items WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting portfolio item:', err);
    res.status(500).json({ error: 'Failed to delete portfolio item' });
  }
});

// ====== REFERRAL SYSTEM ======

// POST /api/features/referral/generate - Generate a referral code for current user
router.post('/referral/generate', authenticate, async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM referrals WHERE referrer_id = ?').get(req.user.id);
    if (existing) {
      return res.json({ referral: existing });
    }

    // Generate unique code from user name
    const base = (req.user.full_name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
    const code = `${base}-${uuidv4().slice(0, 4).toUpperCase()}`;

    const id = uuidv4();
    await db.prepare('INSERT INTO referrals (id, referrer_id, referral_code) VALUES (?, ?, ?)').run(id, req.user.id, code);
    const referral = await db.prepare('SELECT * FROM referrals WHERE id = ?').get(id);
    res.status(201).json({ referral });
  } catch (err) {
    console.error('Error generating referral:', err);
    res.status(500).json({ error: 'Failed to generate referral code' });
  }
});

// GET /api/features/referral/stats - Get referral stats for current user
router.get('/referral/stats', authenticate, async (req, res) => {
  try {
    const referral = await db.prepare('SELECT * FROM referrals WHERE referrer_id = ?').get(req.user.id);
    if (!referral) {
      return res.json({ referral: null, signups: [], totalSignups: 0, totalEarned: 0 });
    }

    const signups = await db.prepare(`
      SELECT rs.*, u.full_name as referred_name, u.profile_picture as referred_picture, u.created_at as joined_at
      FROM referral_signups rs
      JOIN users u ON rs.referred_user_id = u.id
      WHERE rs.referral_id = ?
      ORDER BY rs.created_at DESC
    `).all(referral.id);

    res.json({
      referral,
      signups,
      totalSignups: referral.total_signups,
      totalEarned: referral.total_earned
    });
  } catch (err) {
    console.error('Error fetching referral stats:', err);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// GET /api/features/referral/lookup/:code - Lookup a referral code (for signup)
router.get('/referral/lookup/:code', async (req, res) => {
  try {
    const referral = await db.prepare('SELECT * FROM referrals WHERE referral_code = ?').get(req.params.code);
    if (!referral) {
      return res.status(404).json({ error: 'Referral code not found' });
    }
    const referrer = await db.prepare('SELECT id, full_name FROM users WHERE id = ?').get(referral.referrer_id);
    res.json({ referral, referrer: { name: referrer?.full_name } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup referral code' });
  }
});

// POST /api/features/referral/redeem - Redeem a referral code (called during signup)
router.post('/referral/redeem', authenticate, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Referral code required' });

    const referral = await db.prepare('SELECT * FROM referrals WHERE referral_code = ?').get(code);
    if (!referral) return res.status(404).json({ error: 'Invalid referral code' });
    if (referral.referrer_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    // Check if already referred by this referral
    const existing = await db.prepare('SELECT id FROM referral_signups WHERE referral_id = ? AND referred_user_id = ?').get(referral.id, req.user.id);
    if (existing) {
      return res.status(400).json({ error: 'Already referred by this code' });
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO referral_signups (id, referral_id, referred_user_id) VALUES (?, ?, ?)').run(id, referral.id, req.user.id);
    
    // Update referral stats
    await db.prepare('UPDATE referrals SET total_signups = total_signups + 1 WHERE id = ?').run(referral.id);

    // Notify referrer
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)').run(
      uuidv4(), referral.referrer_id, '🎉 Someone Joined via Your Referral!', `${req.user.full_name || 'Someone'} signed up using your referral code!`, 'referral'
    );

    res.json({ success: true, message: 'Referral code redeemed!' });
  } catch (err) {
    console.error('Error redeeming referral:', err);
    res.status(500).json({ error: 'Failed to redeem referral code' });
  }
});

// ====== LIVE ACTIVITY FEED ======

// GET /api/features/activity-feed - Get recent platform activity (public, cached-friendly)
router.get('/activity-feed', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    // Recent gigs created
    const newGigs = await db.prepare(`
      SELECT 'new_gig' as type, g.id as ref_id, g.title, g.price, g.created_at as timestamp,
             u.full_name as user_name, u.profile_picture as user_picture, g.category
      FROM gigs g JOIN users u ON g.freelancer_id = u.id
      WHERE g.active = 1
      ORDER BY g.created_at DESC LIMIT ?
    `).all(limit);

    // Recent jobs completed
    const completedJobs = await db.prepare(`
      SELECT 'job_completed' as type, j.id as ref_id, j.title, j.budget_max as price, j.updated_at as timestamp,
             u.full_name as user_name, u.profile_picture as user_picture,
             u2.full_name as client_name
      FROM jobs j
      JOIN users u ON j.awarded_to = u.id
      JOIN users u2 ON j.client_id = u2.id
      WHERE j.status = 'completed'
      ORDER BY j.updated_at DESC LIMIT ?
    `).all(limit);

    // Recent jobs posted
    const newJobs = await db.prepare(`
      SELECT 'new_job' as type, j.id as ref_id, j.title, j.budget_max as price, j.created_at as timestamp,
             u.full_name as user_name, u.profile_picture as user_picture, j.category
      FROM jobs j JOIN users u ON j.client_id = u.id
      WHERE j.status = 'open'
      ORDER BY j.created_at DESC LIMIT ?
    `).all(limit);

    // Recent reviews
    const newReviews = await db.prepare(`
      SELECT 'new_review' as type, r.id as ref_id, r.rating, r.created_at as timestamp,
             u.full_name as user_name, u.profile_picture as user_picture,
             u2.full_name as reviewer_name
      FROM reviews r
      JOIN users u ON r.reviewee_id = u.id
      JOIN users u2 ON r.reviewer_id = u2.id
      ORDER BY r.created_at DESC LIMIT ?
    `).all(limit);

    // New user signups (weekly count)
    const newUsers = await db.prepare(`
      SELECT 'new_user' as type, u.id as ref_id, u.full_name as user_name, u.profile_picture as user_picture,
             u.role, u.created_at as timestamp, NULL as title, NULL as price
      FROM users u
      ORDER BY u.created_at DESC LIMIT ?
    `).all(limit);

    // Merge and sort all activities by timestamp
    const allActivities = [...newGigs, ...completedJobs, ...newJobs, ...newReviews, ...newUsers]
      .filter(a => a.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);

    // Format for frontend
    const feed = allActivities.map(a => ({
      ...a,
      timeAgo: getTimeAgo(a.timestamp),
      price: a.price ? `ETB ${Number(a.price).toLocaleString()}` : null,
    }));

    res.json({ feed });
  } catch (err) {
    console.error('Error fetching activity feed:', err);
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
});

function getTimeAgo(dateStr) {
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString();
}

module.exports = router;