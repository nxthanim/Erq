const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// POST /api/jobs/:id/quick-order — Direct order a job (skips bidding, creates a transaction)
router.post('/:id/quick-order', authenticate, async (req, res) => {
  try {
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(req.params.id, 'open');
    if (!job) return res.status(404).json({ error: 'Job not found or not open for orders' });

    const { amount, proposal } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ error: 'A valid amount is required' });
    }

    // Update job status — award to this user
    await db.prepare('UPDATE jobs SET status = ?, awarded_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('in_progress', req.user.id, req.params.id);

    // Create transaction in escrow (following the same pattern as the award endpoint)
    const txnId = uuidv4();
    await db.prepare('INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(txnId, req.params.id, job.client_id, req.user.id, parseFloat(amount), 'escrow');

    // Create notification for the job poster
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, job.client_id, 'New Order on Your Job!',
        `${req.user.full_name || 'A freelancer'} placed a quick order on your job "${job.title}" for ETB ${parseFloat(amount).toLocaleString()}.`,
        'order');

    res.status(201).json({ transactionId: txnId, message: 'Quick order placed successfully!' });
  } catch (err) {
    console.error('Error placing quick order:', err);
    res.status(500).json({ error: 'Failed to place quick order' });
  }
});

// GET /api/jobs - List jobs
router.get('/', async (req, res) => {
  try {
    const { category, search, minBudget, maxBudget, sort, status, clientId, freelancerId } = req.query;
    let query = `
      SELECT j.*, u.full_name as client_name, u.profile_picture as client_picture,
             u.rating as client_rating
      FROM jobs j
      JOIN users u ON j.client_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (category) { query += ' AND j.category = ?'; params.push(category); }
    if (search) { query += ' AND (j.title LIKE ? OR j.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    if (minBudget) { query += ' AND j.budget_max >= ?'; params.push(parseFloat(minBudget)); }
    if (maxBudget) { query += ' AND j.budget_min <= ?'; params.push(parseFloat(maxBudget)); }
    if (status) { query += ' AND j.status = ?'; params.push(status); }
    if (clientId) { query += ' AND j.client_id = ?'; params.push(clientId); }
    if (freelancerId) { query += ' AND j.awarded_to = ?'; params.push(freelancerId); }

    switch (sort) {
      case 'budget_high': query += ' ORDER BY j.budget_max DESC'; break;
      case 'budget_low': query += ' ORDER BY j.budget_min ASC'; break;
      case 'newest': query += ' ORDER BY j.created_at DESC'; break;
      default: query += ' ORDER BY j.created_at DESC';
    }

    const jobs = await db.prepare(query).all(...params);

    // Get bid counts and deliveries for each job
    const jobsWithMeta = [];
    for (const j of jobs) {
      const bidCount = await db.prepare('SELECT COUNT(*) as count FROM bids WHERE job_id = ?').get(j.id).count;
      const delivery = await db.prepare('SELECT * FROM job_deliveries WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(j.id);
      let deliveryFiles = [];
      try { if (delivery) deliveryFiles = JSON.parse(delivery.files || '[]'); } catch {}
      jobsWithMeta.push({ 
        ...j, 
        bid_count: bidCount,
        has_delivery: !!delivery,
        delivery_file_count: deliveryFiles.length,
        delivery_summary: delivery ? { 
          id: delivery.id, 
          message: delivery?.message, 
          file_count: deliveryFiles.length,
          files: deliveryFiles.slice(0, 3),
          created_at: delivery.created_at 
        } : null 
      });
    }

    res.json({ jobs: jobsWithMeta });
  } catch (err) {
    console.error('Error listing jobs:', err);
    res.status(500).json({ error: 'Failed to list jobs' });
  }
});

// GET /api/jobs/:id
router.get('/:id', async (req, res) => {
  try {
    const job = await db.prepare(`
      SELECT j.*, 
        u.full_name as client_name, u.profile_picture as client_picture,
        u.rating as client_rating, u.phone as client_phone, u.city as client_city,
        af.full_name as awarded_name, af.profile_picture as awarded_picture,
        af.rating as awarded_rating, af.verified as awarded_verified, af.city as awarded_city
      FROM jobs j 
      JOIN users u ON j.client_id = u.id 
      LEFT JOIN users af ON j.awarded_to = af.id
      WHERE j.id = ?
    `).get(req.params.id);

    if (!job) return res.status(404).json({ error: 'Job not found' });

    const bids = await db.prepare(`
      SELECT b.*, u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
             u.rating as freelancer_rating, u.verified as freelancer_verified, u.city as freelancer_city
      FROM bids b JOIN users u ON b.freelancer_id = u.id WHERE b.job_id = ? ORDER BY b.amount ASC
    `).all(job.id);

    // Also fetch any active transactions for this job (for quick order info)
    const transactions = await db.prepare(`
      SELECT t.*, 
        u.full_name as freelancer_name, u.profile_picture as freelancer_picture,
        u.rating as freelancer_rating
      FROM transactions t 
      LEFT JOIN users u ON t.freelancer_id = u.id 
      WHERE t.job_id = ?
      ORDER BY t.created_at DESC
    `).all(job.id);

    // Fetch deliveries for this job
    const deliveries = await db.prepare('SELECT * FROM job_deliveries WHERE job_id = ? ORDER BY created_at DESC').all(job.id);

    res.json({ job, bids, transactions, deliveries });
  } catch (err) {
    console.error('Error fetching job:', err);
    res.status(500).json({ error: 'Failed to fetch job' });
  }
});

// POST /api/jobs - Create a job
router.post('/', authenticate, authorize('client'), async (req, res) => {
  try {
    const { title, description, budgetMin, budgetMax, category, deadline } = req.body;
    if (!title || !description || !budgetMin || !budgetMax || !category) {
      return res.status(400).json({ error: 'Title, description, budget range, and category are required' });
    }

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO jobs (id, client_id, title, description, budget_min, budget_max, category, deadline)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, title, description, parseFloat(budgetMin), parseFloat(budgetMax), category, deadline || null);

    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.status(201).json({ job });
  } catch (err) {
    console.error('Error creating job:', err);
    res.status(500).json({ error: 'Failed to create job' });
  }
});

// POST /api/jobs/:id/bid - Place a bid on a job
router.post('/:id/bid', authenticate, authorize('freelancer'), async (req, res) => {
  try {
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND status = ?').get(req.params.id, 'open');
    if (!job) return res.status(404).json({ error: 'Job not found or not accepting bids' });

    const { amount, proposal } = req.body;
    if (!amount) return res.status(400).json({ error: 'Bid amount is required' });

    const existingBid = await db.prepare('SELECT id FROM bids WHERE job_id = ? AND freelancer_id = ?').get(req.params.id, req.user.id);
    if (existingBid) return res.status(409).json({ error: 'You already placed a bid on this job' });

    const id = uuidv4();
    await db.prepare('INSERT INTO bids (id, job_id, freelancer_id, amount, proposal) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.id, req.user.id, parseFloat(amount), proposal || null);

    // Create notification for client
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, job.client_id, 'New Bid Received', `${req.user.full_name} placed a bid of ETB ${amount} on your job "${job.title}"`, 'bid');

    const bid = await db.prepare('SELECT * FROM bids WHERE id = ?').get(id);
    res.status(201).json({ bid });
  } catch (err) {
    console.error('Error placing bid:', err);
    res.status(500).json({ error: 'Failed to place bid' });
  }
});

// PUT /api/jobs/:id/award - Award job to a freelancer
router.put('/:id/award', authenticate, authorize('client'), async (req, res) => {
  try {
    const { freelancerId } = req.body;
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND client_id = ? AND status = ?').get(req.params.id, req.user.id, 'open');
    if (!job) return res.status(404).json({ error: 'Job not found or not open' });

    const bid = await db.prepare('SELECT * FROM bids WHERE job_id = ? AND freelancer_id = ? AND status = ?').get(req.params.id, freelancerId, 'pending');
    if (!bid) return res.status(404).json({ error: 'Bid not found' });

    await db.prepare('UPDATE jobs SET status = ?, awarded_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('in_progress', freelancerId, req.params.id);
    await db.prepare('UPDATE bids SET status = ? WHERE job_id = ? AND freelancer_id = ?').run('accepted', req.params.id, freelancerId);
    await db.prepare('UPDATE bids SET status = ? WHERE job_id = ? AND freelancer_id != ? AND status = ?').run('rejected', req.params.id, freelancerId, 'pending');

    // Create transaction in escrow
    const txnId = uuidv4();
    await db.prepare('INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status) VALUES (?, ?, ?, ?, ?, ?)')
      .run(txnId, req.params.id, req.user.id, freelancerId, bid.amount, 'escrow');

    // Notify freelancer
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, freelancerId, 'Job Awarded!', `You have been awarded the job "${job.title}"!`, 'award');

    res.json({ message: 'Job awarded successfully', transactionId: txnId });
  } catch (err) {
    console.error('Error awarding job:', err);
    res.status(500).json({ error: 'Failed to award job' });
  }
});

// DELETE /api/jobs/:id - Delete a job (only the owner can delete)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ? AND client_id = ?').get(req.params.id, req.user.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or unauthorized' });
    }
    // Soft delete — set status to cancelled
    await db.prepare("UPDATE jobs SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);
    res.json({ message: 'Job cancelled successfully' });
  } catch (err) {
    console.error('Error deleting job:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// PUT /api/jobs/:id/deliver - Freelancer delivers finished work with files
router.put('/:id/deliver', authenticate, async (req, res) => {
  try {
    const job = await db.prepare("SELECT * FROM jobs WHERE id = ? AND status = 'in_progress'").get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found or not in progress' });
    if (job.awarded_to !== req.user.id) return res.status(403).json({ error: 'Only the awarded freelancer can deliver' });

    const { message, files } = req.body;

    if (files && Array.isArray(files) && files.length > 0) {
      if (files.length > 10) return res.status(400).json({ error: 'Maximum 10 files per delivery' });

      for (const f of files) {
        if (!f.name || !f.type || !f.data)
          return res.status(400).json({ error: 'Each file must have name, type, and data fields' });

        const estimatedBytes = (f.data?.length || 0) * 0.75;
        if (estimatedBytes > 100 * 1024 * 1024) {
          return res.status(400).json({ error: `File "${f.name}" exceeds 100MB limit` });
        }
      }

      const deliveryId = uuidv4();
      await db.prepare(`
        INSERT INTO job_deliveries (id, job_id, freelancer_id, message, files)
        VALUES ($1, $2, $3, $4, $5)
      `).run(deliveryId, req.params.id, req.user.id, message || '', JSON.stringify(files));
      console.log(`📁 Job delivery saved for job ${req.params.id.slice(0, 8)}: ${files.length} file(s)`);
    }

    await db.prepare("UPDATE jobs SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    // Notify client
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, job.client_id, 'Work Delivered!',
        `${req.user.full_name || 'The freelancer'} has delivered the finished work for "${job.title}". Please review and approve.`,
        'order');

    res.json({ message: 'Work delivered successfully', deliverySaved: !!(files && files.length > 0) });
  } catch (err) {
    console.error('Error delivering job work:', err);
    res.status(500).json({ error: 'Failed to deliver work' });
  }
});

// PUT /api/jobs/:id/status - Update job status (complete, cancel)
router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const job = await db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    if (status === 'completed') {
      if (job.client_id !== req.user.id) return res.status(403).json({ error: 'Only the client can mark as completed' });
    }

    await db.prepare('UPDATE jobs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, req.params.id);
    res.json({ message: 'Job status updated' });
  } catch (err) {
    console.error('Error updating job status:', err);
    res.status(500).json({ error: 'Failed to update job status' });
  }
});

module.exports = router;
