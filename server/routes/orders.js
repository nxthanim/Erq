const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// GET /api/orders - List orders (client sees their purchases, freelancer sees their sales)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const userId = req.user.id;
    
    let query = `
      SELECT o.*, 
        g.title as gig_title, g.category as gig_category,
        g.delivery_time as gig_delivery_time,
        u_client.full_name as client_name, u_client.profile_picture as client_picture,
        u_freelancer.full_name as freelancer_name, u_freelancer.profile_picture as freelancer_picture
      FROM orders o
      LEFT JOIN users u_client ON o.client_id = u_client.id
      LEFT JOIN users u_freelancer ON o.freelancer_id = u_freelancer.id
      LEFT JOIN gigs g ON o.gig_id = g.id
      WHERE (o.client_id = ? OR o.freelancer_id = ?)
    `;
    const params = [userId, userId];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    query += ' ORDER BY o.created_at DESC';

    let orders = await db.prepare(query).all(...params);

    // Attach transaction info AND delivery info to each order
    // Wrapped in try/catch so a single failed metadata fetch doesn't kill the whole list
    const ordersWithMeta = [];
    for (const order of orders) {
      try {
        let transaction = null;
        if (order.transaction_id) {
          transaction = await db.prepare('SELECT id, amount, status as txn_status, confirmation_selfie, confirmation_audio, confirmed_at FROM transactions WHERE id = ?').get(order.transaction_id);
        }
        const delivery = await db.prepare('SELECT * FROM order_deliveries WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(order.id);
        ordersWithMeta.push({ ...order, transaction: transaction || null, delivery: delivery || null });
      } catch (metaErr) {
        console.error(`⚠️ Failed to attach metadata for order ${order.id}:`, metaErr.message);
        ordersWithMeta.push({ ...order, transaction: null, delivery: null });
      }
    }
    orders = ordersWithMeta;

    res.json({ orders });
  } catch (err) {
    console.error('Error listing orders:', err);
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

// GET /api/orders/:id - Get a single order
router.get('/:id', async (req, res) => {
  try {
    const order = await db.prepare(`
      SELECT o.*,
        g.title as gig_title, g.category as gig_category, g.description as gig_description,
        g.delivery_time as gig_delivery_time, g.portfolio_images as gig_portfolio_images,
        u_client.full_name as client_name, u_client.profile_picture as client_picture,
        u_client.phone as client_phone, u_client.city as client_city,
        u_freelancer.full_name as freelancer_name, u_freelancer.profile_picture as freelancer_picture,
        u_freelancer.rating as freelancer_rating, u_freelancer.verified as freelancer_verified,
        u_freelancer.phone as freelancer_phone, u_freelancer.city as freelancer_city
      FROM orders o
      JOIN users u_client ON o.client_id = u_client.id
      JOIN users u_freelancer ON o.freelancer_id = u_freelancer.id
      LEFT JOIN gigs g ON o.gig_id = g.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ error: 'Order not found' });

    // Only participants can view
    if (order.client_id !== req.user.id && order.freelancer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Attach transaction info
    let transaction = null;
    if (order.transaction_id) {
      transaction = await db.prepare('SELECT id, amount, status as txn_status, confirmation_selfie, confirmation_audio, confirmed_at FROM transactions WHERE id = ?').get(order.transaction_id);
    }
    // Attach deliveries
    const deliveries = await db.prepare('SELECT * FROM order_deliveries WHERE order_id = ? ORDER BY created_at DESC').all(req.params.id);

    res.json({ order: { ...order, transaction, deliveries } });
  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST /api/orders - Create a new order (client purchases a gig)
router.post('/', async (req, res) => {
  try {
    const { gigId, requirements } = req.body;
    if (!gigId) return res.status(400).json({ error: 'Gig ID is required' });

    const gig = await db.prepare(`
      SELECT g.*, u.full_name as freelancer_name 
      FROM gigs g JOIN users u ON g.freelancer_id = u.id 
      WHERE g.id = ? AND g.active = 1
    `).get(gigId);

    if (!gig) return res.status(404).json({ error: 'Gig not found' });
    if (gig.freelancer_id === req.user.id) return res.status(400).json({ error: 'Cannot order your own gig' });

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO orders (id, gig_id, client_id, freelancer_id, title, description, price, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, gigId, req.user.id, gig.freelancer_id, gig.title, gig.description, gig.price, requirements || null);

    // Create notification for freelancer
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, gig.freelancer_id, 'New Order Received!', 
        `${req.user.full_name || 'A client'} placed an order for your gig "${gig.title}" (ETB ${gig.price}). Review and accept it!`,
        'order');

    const order = await db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    res.status(201).json({ order });
  } catch (err) {
    console.error('Error creating order:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT /api/orders/:id/accept - Freelancer accepts the order & creates escrow transaction
router.put('/:id/accept', async (req, res) => {
  try {
    const order = await db.prepare('SELECT * FROM orders WHERE id = ? AND status = ?').get(req.params.id, 'pending');
    if (!order) return res.status(404).json({ error: 'Order not found or not pending' });
    if (order.freelancer_id !== req.user.id) return res.status(403).json({ error: 'Only the freelancer can accept' });

    // Create escrow transaction for biometric confirmation
    // job_id is NULL for order-based transactions (gig purchases, not jobs)
    const txnId = uuidv4();
    await db.prepare('INSERT INTO transactions (id, job_id, client_id, freelancer_id, amount, status, order_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(txnId, null, order.client_id, order.freelancer_id, order.price, 'escrow', req.params.id);

    await db.prepare("UPDATE orders SET status = 'accepted', transaction_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(txnId, req.params.id);

    // Notify client
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, order.client_id, 'Order Accepted!', 
        `${req.user.full_name || 'The freelancer'} accepted your order for "${order.title}". ETB ${order.price} held in escrow awaiting biometric confirmation.`,
        'order');

    res.json({ message: 'Order accepted, escrow created' });
  } catch (err) {
    console.error('Error accepting order:', err);
    res.status(500).json({ error: 'Failed to accept order' });
  }
});

// PUT /api/orders/:id/deliver - Freelancer marks as delivered (with optional file upload)
router.put('/:id/deliver', async (req, res) => {
  try {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'accepted'").get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found or not in accepted status' });
    if (order.freelancer_id !== req.user.id) return res.status(403).json({ error: 'Only the freelancer can deliver' });

    // Save delivery files if provided
    const { message, files } = req.body; // files: [{ name, url, size, type }]
    
    if (files && Array.isArray(files) && files.length > 0) {
      // Server-side validation: max 10 files, max 100MB per file (base64)
      if (files.length > 10) return res.status(400).json({ error: 'Maximum 10 files per delivery' });
      
      for (const f of files) {
        if (!f.name || !f.type || !f.data) 
          return res.status(400).json({ error: 'Each file must have name, type, and data fields' });
        
        // Validate file size from base64 string length
        // Base64 adds ~33% overhead: original_bytes = base64_len * 0.75
        const estimatedBytes = (f.data?.length || 0) * 0.75;
        if (estimatedBytes > 100 * 1024 * 1024) {
          return res.status(400).json({ error: `File "${f.name}" exceeds 100MB limit` });
        }
        
        // Accept any file format — no base64 validation (many encoders add newlines/padding)
      }
      
      const deliveryId = uuidv4();
      await db.prepare(`
        INSERT INTO order_deliveries (id, order_id, freelancer_id, message, files)
        VALUES ($1, $2, $3, $4, $5)
      `).run(deliveryId, req.params.id, req.user.id, message || '', JSON.stringify(files));
      console.log(`📁 Delivery saved for order ${req.params.id.slice(0, 8)}: ${files.length} file(s)`);
    }

    await db.prepare("UPDATE orders SET status = 'delivered', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    // Notify client
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, order.client_id, 'Order Delivered!', 
        `${req.user.full_name || 'The freelancer'} has delivered your order for "${order.title}". Please review and approve.`,
        'order');

    res.json({ message: 'Order marked as delivered', deliverySaved: !!(files && files.length > 0) });
  } catch (err) {
    console.error('Error delivering order:', err);
    res.status(500).json({ error: 'Failed to deliver order' });
  }
});

// PUT /api/orders/:id/complete - Client approves and completes (releases escrow payment)
router.put('/:id/complete', async (req, res) => {
  try {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND status = 'delivered'").get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found or not delivered' });
    if (order.client_id !== req.user.id) return res.status(403).json({ error: 'Only the client can complete' });

    // Release the escrow transaction (created during accept)
    if (!order.transaction_id) {
      return res.status(400).json({ error: 'No transaction found for this order' });
    }

    const txn = await db.prepare('SELECT * FROM transactions WHERE id = ?').get(order.transaction_id);
    if (!txn) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    // Allow release even if not confirmed (client can still release)
    await db.prepare("UPDATE transactions SET status = 'released', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(order.transaction_id);

    await db.prepare("UPDATE orders SET status = 'completed', updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(req.params.id);

    // Notify freelancer
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, order.freelancer_id, 'Payment Released!', 
        `ETB ${order.price} has been released for your order "${order.title}". Well done!`,
        'payment');

    res.json({ message: 'Order completed, payment released' });
  } catch (err) {
    console.error('Error completing order:', err);
    res.status(500).json({ error: 'Failed to complete order' });
  }
});

// PUT /api/orders/:id/cancel - Cancel order (client before acceptance, freelancer any time)
router.put('/:id/cancel', async (req, res) => {
  try {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND status NOT IN ('completed', 'cancelled')").get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found or already finalized' });

    // Client can cancel if pending, Freelancer can cancel if pending/accepted
    if (req.user.id === order.client_id && order.status !== 'pending') {
      return res.status(400).json({ error: 'Client can only cancel pending orders' });
    }
    if (req.user.id !== order.client_id && req.user.id !== order.freelancer_id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.prepare("UPDATE orders SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    res.json({ message: 'Order cancelled' });
  } catch (err) {
    console.error('Error cancelling order:', err);
    res.status(500).json({ error: 'Failed to cancel order' });
  }
});

// PUT /api/orders/:id/dispute - Raise a dispute
router.put('/:id/dispute', async (req, res) => {
  try {
    const order = await db.prepare("SELECT * FROM orders WHERE id = ? AND status IN ('accepted', 'in_progress', 'delivered')").get(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found or cannot be disputed' });
    if (order.client_id !== req.user.id && order.freelancer_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await db.prepare("UPDATE orders SET status = 'disputed', updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(req.params.id);

    // Notify the other party
    const notifyUserId = order.client_id === req.user.id ? order.freelancer_id : order.client_id;
    const notifId = uuidv4();
    await db.prepare('INSERT INTO notifications (id, user_id, title, message, type) VALUES (?, ?, ?, ?, ?)')
      .run(notifId, notifyUserId, 'Order Disputed', 
        `An order "${order.title}" has been disputed. An admin will review it shortly.`,
        'dispute');

    res.json({ message: 'Dispute raised, admin will review' });
  } catch (err) {
    console.error('Error disputing order:', err);
    res.status(500).json({ error: 'Failed to dispute order' });
  }
});

module.exports = router;
