const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

// GET /api/gigs - List all gigs with filters & view counts
router.get('/', async (req, res) => {
  try {
    const { category, search, minPrice, maxPrice, sort, freelancerId, trending, popular } = req.query;
    let query = `
      SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating, u.verified as freelancer_verified,
             (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
      FROM gigs g
      JOIN users u ON g.freelancer_id = u.id
      WHERE g.active = 1
    `;
    const params = [];

    if (category) {
      query += ' AND g.category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (g.title LIKE ? OR g.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (minPrice) {
      query += ' AND g.price >= ?';
      params.push(parseFloat(minPrice));
    }

    if (maxPrice) {
      query += ' AND g.price <= ?';
      params.push(parseFloat(maxPrice));
    }

    if (freelancerId) {
      query += ' AND g.freelancer_id = ?';
      params.push(freelancerId);
    }

    if (trending === 'true' || popular === 'true') {
      // Last 7 days views for trending
      switch (sort) {
        case 'views':
          query += ' ORDER BY view_count DESC';
          break;
        default:
          query += ' ORDER BY view_count DESC, g.created_at DESC';
      }
    } else {
      switch (sort) {
        case 'price_low':
          query += ' ORDER BY g.price ASC';
          break;
        case 'price_high':
          query += ' ORDER BY g.price DESC';
          break;
        case 'rating':
          query += ' ORDER BY u.rating DESC';
          break;
        case 'views':
          query += ' ORDER BY view_count DESC';
          break;
        case 'newest':
          query += ' ORDER BY g.created_at DESC';
          break;
        default:
          query += ' ORDER BY g.created_at DESC';
      }
    }

    const gigs = await db.prepare(query).all(...params);
    res.json({ gigs });
  } catch (err) {
    console.error('Error listing gigs:', err);
    res.status(500).json({ error: 'Failed to list gigs' });
  }
});

// GET /api/gigs/trending - Get trending gigs (most viewed this week)
router.get('/trending', async (req, res) => {
  try {
    const gigs = await db.prepare(`
      SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating, u.verified as freelancer_verified,
             (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id AND created_at > NOW() - INTERVAL '7 days') as weekly_views
      FROM gigs g
      JOIN users u ON g.freelancer_id = u.id
      WHERE g.active = 1
      ORDER BY weekly_views DESC
      LIMIT 12
    `).all();
    res.json({ gigs });
  } catch (err) {
    console.error('Error fetching trending gigs:', err);
    res.status(500).json({ error: 'Failed to fetch trending gigs' });
  }
});

// GET /api/gigs/popular - Get all-time most viewed gigs
router.get('/popular', async (req, res) => {
  try {
    const gigs = await db.prepare(`
      SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating, u.verified as freelancer_verified,
             (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
      FROM gigs g
      JOIN users u ON g.freelancer_id = u.id
      WHERE g.active = 1
      ORDER BY view_count DESC
      LIMIT 12
    `).all();
    res.json({ gigs });
  } catch (err) {
    console.error('Error fetching popular gigs:', err);
    res.status(500).json({ error: 'Failed to fetch popular gigs' });
  }
});

// GET /api/gigs/:id
router.get('/:id', async (req, res) => {
  try {
    const gig = await db.prepare(`
      SELECT g.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating, u.verified as freelancer_verified, u.bio as freelancer_bio,
             u.city as freelancer_city,
             (SELECT COUNT(*) FROM gig_views WHERE gig_id = g.id) as view_count
      FROM gigs g JOIN users u ON g.freelancer_id = u.id WHERE g.id = ?
    `).get(req.params.id);

    if (!gig) {
      return res.status(404).json({ error: 'Gig not found' });
    }

    // Track this view
    try {
      const viewerIp = req.ip || req.connection.remoteAddress || 'unknown';
      await db.prepare('INSERT INTO gig_views (id, gig_id, viewer_ip) VALUES (?, ?, ?)').run(uuidv4(), req.params.id, viewerIp);
    } catch {}

    res.json({ gig });
  } catch (err) {
    console.error('Error fetching gig:', err);
    res.status(500).json({ error: 'Failed to fetch gig' });
  }
});

// POST /api/gigs - Create a gig (available to all authenticated users)
router.post('/', authenticate, upload.array('portfolio_images', 5), async (req, res) => {
  try {
    const { title, description, price, category, deliveryTime } = req.body;

    if (!title || !description || !price || !category || !deliveryTime) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validCategories = ['Translation', 'Graphic Design', 'Video Editing', 'Web Development', 'Virtual Assistant', 'Social Media Management'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const id = uuidv4();
    const portfolioImages = req.files ? req.files.map(f => `/uploads/portfolio/${f.filename}`) : [];

    await db.prepare(`
      INSERT INTO gigs (id, freelancer_id, title, description, price, category, delivery_time, portfolio_images)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, parseFloat(price), category, parseInt(deliveryTime), JSON.stringify(portfolioImages));

    const gig = await db.prepare('SELECT * FROM gigs WHERE id = ?').get(id);
    res.status(201).json({ gig });
  } catch (err) {
    console.error('Error creating gig:', err);
    res.status(500).json({ error: 'Failed to create gig' });
  }
});

// PUT /api/gigs/:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const gig = await db.prepare('SELECT * FROM gigs WHERE id = ? AND freelancer_id = ?').get(req.params.id, req.user.id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found or unauthorized' });
    }

    const { title, description, price, category, deliveryTime, active } = req.body;
    await db.prepare(`
      UPDATE gigs SET title = COALESCE(?, title), description = COALESCE(?, description),
      price = COALESCE(?, price), category = COALESCE(?, category),
      delivery_time = COALESCE(?, delivery_time), active = COALESCE(?, active),
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(title || null, description || null, price ? parseFloat(price) : null, category || null, deliveryTime ? parseInt(deliveryTime) : null, active !== undefined ? (active ? 1 : 0) : null, req.params.id);

    const updated = await db.prepare('SELECT * FROM gigs WHERE id = ?').get(req.params.id);
    res.json({ gig: updated });
  } catch (err) {
    console.error('Error updating gig:', err);
    res.status(500).json({ error: 'Failed to update gig' });
  }
});

// DELETE /api/gigs/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const gig = await db.prepare('SELECT * FROM gigs WHERE id = ? AND freelancer_id = ?').get(req.params.id, req.user.id);
    if (!gig) {
      return res.status(404).json({ error: 'Gig not found or unauthorized' });
    }
    await db.prepare('UPDATE gigs SET active = 0 WHERE id = ?').run(req.params.id);
    res.json({ message: 'Gig deleted successfully' });
  } catch (err) {
    console.error('Error deleting gig:', err);
    res.status(500).json({ error: 'Failed to delete gig' });
  }
});

module.exports = router;
