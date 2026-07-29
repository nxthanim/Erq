const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/reviews - Create a review
router.post('/', authenticate, async (req, res) => {
  try {
    const { jobId, revieweeId, rating, comment, role } = req.body;
    
    if (!jobId || !revieweeId || !rating || !role) {
      return res.status(400).json({ error: 'Job ID, reviewee, rating, and role are required' });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    // Check if already reviewed
    const existing = await db.prepare('SELECT id FROM reviews WHERE job_id = ? AND reviewer_id = ?').get(jobId, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'You have already reviewed this job' });
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO reviews (id, job_id, reviewer_id, reviewee_id, rating, comment, role) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, jobId, req.user.id, revieweeId, rating, comment || null, role);

    // Update user rating
    const stats = await db.prepare('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE reviewee_id = ?').get(revieweeId);
    await db.prepare('UPDATE users SET rating = ROUND(?, 1), review_count = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
      .run(stats.avg_rating || 0, stats.count, revieweeId);

    // Create notification for the reviewee
    const reviewer = await db.prepare('SELECT full_name FROM users WHERE id = ?').get(req.user.id);
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, revieweeId, 'New Review Received!',
        `${reviewer?.full_name || 'Someone'} reviewed you with ${rating}/5 stars: "${comment?.slice(0, 100) || 'No comment'}"`,
        'review');

    const review = await db.prepare('SELECT * FROM reviews WHERE id = ?').get(id);
    res.status(201).json({ review });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// GET /api/reviews/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const reviews = await db.prepare(`
      SELECT r.*, u.full_name as reviewer_name, u.profile_picture as reviewer_picture
      FROM reviews r JOIN users u ON r.reviewer_id = u.id
      WHERE r.reviewee_id = ? ORDER BY r.created_at DESC
    `).all(req.params.userId);
    res.json({ reviews });
  } catch (err) {
    console.error('Error fetching reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

module.exports = router;
