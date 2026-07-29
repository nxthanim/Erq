const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/users/freelancers - List all freelancers
router.get('/freelancers', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort } = req.query;
    let query = `
      SELECT u.id, u.full_name, u.email, u.phone, u.city, u.profile_picture, 
             u.bio, u.skills, u.verified, u.rating, u.review_count,
             u.created_at
      FROM users u 
      WHERE u.role = 'freelancer'
    `;
    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.bio LIKE ? OR u.skills LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      query += ` AND u.id IN (SELECT DISTINCT freelancer_id FROM gigs WHERE category = ? AND active = 1)`;
      params.push(category);
    }

    // Sort
    switch (sort) {
      case 'rating':
        query += ' ORDER BY u.rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY u.created_at DESC';
        break;
      default:
        query += ' ORDER BY u.rating DESC, u.review_count DESC';
    }

    const freelancers = await db.prepare(query).all(...params);

    // Get gigs for each freelancer
    const freelancersWithGigs = [];
    for (const f of freelancers) {
      const gigs = await db.prepare('SELECT id, title, price, category, delivery_time FROM gigs WHERE freelancer_id = ? AND active = 1').all(f.id);
      freelancersWithGigs.push({ ...f, gigs });
    }

    res.json({ freelancers: freelancersWithGigs });
  } catch (err) {
    console.error('Error listing freelancers:', err);
    res.status(500).json({ error: 'Failed to list freelancers' });
  }
});

// GET /api/users/search - Search all users by name (for messaging)
router.get('/search', authenticate, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ users: [] });
    }
    const searchTerm = `%${q.trim()}%`;
    const users = await db.prepare(`
      SELECT id, full_name, email, profile_picture, role, city, rating
      FROM users 
      WHERE (full_name LIKE ? OR email LIKE ?) AND id != ?
      ORDER BY 
        CASE 
          WHEN email LIKE ? THEN 0
          WHEN full_name LIKE ? THEN 1
          ELSE 2
        END,
        rating DESC,
        full_name ASC
      LIMIT ?
    `).all(searchTerm, searchTerm, req.user.id, q.trim() + '%', searchTerm, parseInt(limit) || 10);
    res.json({ users });
  } catch (err) {
    console.error('Error searching users:', err);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// GET /api/users/top-freelancers - Get top freelancers for leaderboard
router.get('/top-freelancers', async (req, res) => {
  try {
    const { sortBy } = req.query;
    let query;
    
    switch (sortBy) {
      case 'earnings':
        query = `SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                 (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
                 FROM users u WHERE u.role = 'freelancer' ORDER BY (SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE freelancer_id = u.id AND status = 'released') DESC LIMIT 10`;
        break;
      case 'jobs':
        query = `SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                 (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
                 FROM users u WHERE u.role = 'freelancer' ORDER BY (SELECT COUNT(*) FROM transactions WHERE freelancer_id = u.id AND status = 'released') DESC LIMIT 10`;
        break;
      default: // rating
        query = `SELECT u.id, u.full_name, u.city, u.profile_picture, u.rating, u.review_count,
                 (SELECT COUNT(*) FROM gigs WHERE freelancer_id = u.id) as total_gigs
                 FROM users u WHERE u.role = 'freelancer' ORDER BY u.rating DESC, u.review_count DESC LIMIT 10`;
    }

    const freelancers = await db.prepare(query).all();
    res.json({ freelancers });
  } catch (err) {
    console.error('Error fetching top freelancers:', err);
    res.status(500).json({ error: 'Failed to fetch top freelancers' });
  }
});

// GET /api/users/online-status — batch check which users are online (active in last 30 seconds)
// IMPORTANT: Must be BEFORE /:id so Express doesn't catch "online-status" as a user ID
router.get('/online-status', authenticate, async (req, res) => {
  try {
    const { userIds } = req.query;
    if (!userIds) return res.json({ online: [] });
    
    const ids = userIds.split(',').filter(Boolean).map(id => id.trim());
    if (ids.length === 0) return res.json({ online: [] });
    
    // Users active within the last 30 seconds are considered "online"
    const placeholders = ids.map((_, i) => '$' + (i + 1)).join(',');
    const online = await db.prepare(`
      SELECT id FROM users 
      WHERE id IN (${placeholders}) 
        AND last_active_at > CURRENT_TIMESTAMP - INTERVAL '30 seconds'
    `).all(...ids);
    
    res.json({ online: online.map(u => u.id) });
  } catch (err) {
    console.error('Error checking online status:', err);
    res.json({ online: [] });
  }
});

// GET /api/users/:id - Get user profile
router.get('/:id', async (req, res) => {
  try {
    const user = await db.prepare('SELECT id, email, full_name, role, phone, city, profile_picture, bio, skills, verified, rating, review_count, created_at FROM users WHERE id = ?').get(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.role === 'freelancer') {
      user.gigs = await db.prepare('SELECT * FROM gigs WHERE freelancer_id = ? AND active = 1').all(user.id);
      user.reviews = await db.prepare(`
        SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_picture 
        FROM reviews r JOIN users u ON r.reviewer_id = u.id 
        WHERE r.reviewee_id = ? ORDER BY r.created_at DESC
      `).all(user.id);
    }

    res.json({ user });
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PUT /api/users/profile-picture
router.put('/profile-picture', authenticate, upload.single('profile_picture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    const { getFileUrl } = require('../middleware/upload');
    const url = getFileUrl(req, req.file);
    await db.prepare('UPDATE users SET profile_picture = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(url, req.user.id);
    res.json({ profile_picture: url });
  } catch (err) {
    console.error('Profile picture upload error:', err);
    res.status(500).json({ error: 'Failed to upload profile picture' });
  }
});

module.exports = router;
