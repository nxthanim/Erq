const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ====== OVERVIEW ======
router.get('/overview', async (req, res) => {
  try {
    const userId = req.user.id;
    const totalCustomers = (await db.prepare('SELECT COUNT(*) as count FROM business_customers WHERE user_id = ?').get(userId)).count;
    const activeCustomers = (await db.prepare("SELECT COUNT(*) as count FROM business_customers WHERE user_id = ? AND status = 'active'").get(userId)).count;
    const totalInvoiced = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM business_invoices WHERE user_id = ? AND status != 'cancelled'").get(userId)).total;
    const totalPaid = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM business_invoices WHERE user_id = ? AND status = 'paid'").get(userId)).total;
    const upcomingMeetings = (await db.prepare("SELECT COUNT(*) as count FROM business_meetings WHERE user_id = ? AND status = 'scheduled' AND date > NOW()").get(userId)).count;
    const teamSize = (await db.prepare("SELECT COUNT(*) as count FROM business_team WHERE user_id = ? AND status = 'active'").get(userId)).count;

    // Platform-wide competitor data
    const totalFreelancers = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'freelancer'").get()).count;
    const totalClients = (await db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'client'").get()).count;
    const totalTransactions = (await db.prepare('SELECT COUNT(*) as count FROM transactions').get()).count;
    const totalRevenue = (await db.prepare("SELECT COALESCE(SUM(amount), 0) as total FROM transactions WHERE status = 'released'").get()).total;

    res.json({ overview: {
      totalCustomers, activeCustomers, totalInvoiced: Math.round(totalInvoiced),
      totalPaid: Math.round(totalPaid), pendingInvoices: Math.round(totalInvoiced - totalPaid),
      upcomingMeetings, teamSize,
      platformTotalUsers: totalFreelancers + totalClients,
      platformTotalFreelancers: totalFreelancers,
      platformTotalClients: totalClients,
      platformTotalTransactions: totalTransactions,
      platformTotalRevenue: Math.round(totalRevenue),
    }});
  } catch (err) {
    console.error('Business overview error:', err);
    res.status(500).json({ error: 'Failed to fetch business overview' });
  }
});

// ====== COMPETITORS ======
router.get('/competitors', async (req, res) => {
  try {
    const allGigs = await db.prepare('SELECT category, COUNT(*) as count, AVG(price) as avg_price FROM gigs WHERE active = 1 GROUP BY category').all();
    const topFreelancers = await db.prepare('SELECT full_name, rating, review_count, city FROM users WHERE role = ? AND verified = 1 ORDER BY rating DESC LIMIT 10').all('freelancer');
    const categoryDemand = await db.prepare('SELECT category, COUNT(*) as count FROM jobs WHERE status = ? GROUP BY category ORDER BY count DESC').all('open');
    const avgPrices = await db.prepare('SELECT category, AVG(price) as avg_price, COUNT(*) as count FROM gigs WHERE active = 1 GROUP BY category ORDER BY count DESC').all();

    res.json({ competitors: {
      topFreelancers,
      categoryDistribution: allGigs,
      categoryDemand,
      avgPrices,
      marketInsights: {
        totalActiveGigs: allGigs.reduce((s, g) => s + g.count, 0),
        avgGigPrice: allGigs.length > 0 ? Math.round(allGigs.reduce((s, g) => s + (g.avg_price || 0), 0) / allGigs.length) : 0,
        highestDemandCategory: categoryDemand[0]?.category || 'N/A',
      }
    }});
  } catch (err) {
    console.error('Competitor analysis error:', err);
    res.status(500).json({ error: 'Failed to fetch competitor data' });
  }
});

// ====== TRANSACTIONS (Mega) ======
router.get('/transactions', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const statusFilter = req.query.status || '';

    let whereClause = '(t.client_id = ? OR t.freelancer_id = ?)';
    const params = [userId, userId];
    if (statusFilter && ['escrow', 'released', 'refunded', 'disputed'].includes(statusFilter)) {
      whereClause += ' AND t.status = ?';
      params.push(statusFilter);
    }

    const total = (await db.prepare(`SELECT COUNT(*) as count FROM transactions t WHERE ${whereClause}`).get(...params)).count;
    const transactions = await db.prepare(`
      SELECT t.*, j.title as job_title, u1.full_name as client_name, u2.full_name as freelancer_name
      FROM transactions t
      JOIN jobs j ON t.job_id = j.id
      JOIN users u1 ON t.client_id = u1.id
      JOIN users u2 ON t.freelancer_id = u2.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    res.json({ transactions, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Business transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ====== CUSTOMERS (CRM) ======
router.get('/customers', async (req, res) => {
  try {
    const customers = await db.prepare('SELECT * FROM business_customers WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
    res.json({ customers });
  } catch (err) {
    console.error('Customers fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/customers', async (req, res) => {
  try {
    const { name, email, phone, company, notes } = req.body;
    if (!name) return res.status(400).json({ error: 'Customer name is required' });
    const id = uuidv4();
    await db.prepare('INSERT INTO business_customers (id, user_id, name, email, phone, company, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, name, email || null, phone || null, company || null, notes || null);
    const customer = await db.prepare('SELECT * FROM business_customers WHERE id = ?').get(id);
    res.status(201).json({ customer });
  } catch (err) {
    console.error('Customer create error:', err);
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

router.put('/customers/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_customers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    const { name, email, phone, company, notes, status } = req.body;
    await db.prepare(`UPDATE business_customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone), company = COALESCE(?, company), notes = COALESCE(?, notes), status = COALESCE(?, status), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(name || null, email || null, phone || null, company || null, notes || null, status || null, req.params.id);
    const customer = await db.prepare('SELECT * FROM business_customers WHERE id = ?').get(req.params.id);
    res.json({ customer });
  } catch (err) {
    console.error('Customer update error:', err);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

router.delete('/customers/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_customers WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });
    await db.prepare('DELETE FROM business_customers WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Customer delete error:', err);
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

// ====== MEETINGS ======
router.get('/meetings', async (req, res) => {
  try {
    const meetings = await db.prepare(`
      SELECT m.*, c.name as customer_name, c.company as customer_company
      FROM business_meetings m LEFT JOIN business_customers c ON m.customer_id = c.id
      WHERE m.user_id = ? ORDER BY m.date ASC
    `).all(req.user.id);
    res.json({ meetings });
  } catch (err) {
    console.error('Meetings fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

router.post('/meetings', async (req, res) => {
  try {
    const { title, description, date, duration, customerId, meetingType } = req.body;
    if (!title || !date) return res.status(400).json({ error: 'Title and date are required' });
    const id = uuidv4();
    await db.prepare('INSERT INTO business_meetings (id, user_id, customer_id, title, description, date, duration, meeting_type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, customerId || null, title, description || null, date, duration || 30, meetingType || 'video');
    const meeting = await db.prepare(`
      SELECT m.*, c.name as customer_name, c.company as customer_company
      FROM business_meetings m LEFT JOIN business_customers c ON m.customer_id = c.id WHERE m.id = ?
    `).get(id);
    res.status(201).json({ meeting });
  } catch (err) {
    console.error('Meeting create error:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

router.put('/meetings/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_meetings WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Meeting not found' });
    const { title, description, date, duration, status, meetingType } = req.body;
    await db.prepare(`UPDATE business_meetings SET title = COALESCE(?, title), description = COALESCE(?, description), date = COALESCE(?, date), duration = COALESCE(?, duration), status = COALESCE(?, status), meeting_type = COALESCE(?, meeting_type) WHERE id = ?`)
      .run(title || null, description || null, date || null, duration || null, status || null, meetingType || null, req.params.id);
    const meeting = await db.prepare('SELECT * FROM business_meetings WHERE id = ?').get(req.params.id);
    res.json({ meeting });
  } catch (err) {
    console.error('Meeting update error:', err);
    res.status(500).json({ error: 'Failed to update meeting' });
  }
});

// ====== INVOICES ======
router.get('/invoices', async (req, res) => {
  try {
    const invoices = await db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company
      FROM business_invoices i LEFT JOIN business_customers c ON i.customer_id = c.id
      WHERE i.user_id = ? ORDER BY i.created_at DESC
    `).all(req.user.id);
    const parsed = invoices.map(inv => ({ ...inv, line_items: JSON.parse(inv.line_items || '[]') }));
    res.json({ invoices: parsed });
  } catch (err) {
    console.error('Invoices fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

router.post('/invoices', async (req, res) => {
  try {
    const { customerId, amount, dueDate, lineItems, notes } = req.body;
    if (!amount) return res.status(400).json({ error: 'Amount is required' });
    const id = uuidv4();
    const invNum = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
    await db.prepare('INSERT INTO business_invoices (id, user_id, customer_id, invoice_number, amount, due_date, line_items, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(id, req.user.id, customerId || null, invNum, amount, dueDate || null, JSON.stringify(lineItems || []), notes || null);
    const invoice = await db.prepare(`
      SELECT i.*, c.name as customer_name, c.company as customer_company
      FROM business_invoices i LEFT JOIN business_customers c ON i.customer_id = c.id WHERE i.id = ?
    `).get(id);
    res.status(201).json({ invoice: { ...invoice, line_items: JSON.parse(invoice.line_items || '[]') } });
  } catch (err) {
    console.error('Invoice create error:', err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

router.put('/invoices/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_invoices WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Invoice not found' });
    const { status, paidDate } = req.body;
    await db.prepare(`UPDATE business_invoices SET status = COALESCE(?, status), paid_date = COALESCE(?, paid_date), updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
      .run(status || null, paidDate || null, req.params.id);
    const invoice = await db.prepare('SELECT * FROM business_invoices WHERE id = ?').get(req.params.id);
    res.json({ invoice: { ...invoice, line_items: JSON.parse(invoice.line_items || '[]') } });
  } catch (err) {
    console.error('Invoice update error:', err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// ====== TEAM ======
router.get('/team', async (req, res) => {
  try {
    const team = await db.prepare('SELECT * FROM business_team WHERE user_id = ? ORDER BY joined_at DESC').all(req.user.id);
    res.json({ team });
  } catch (err) {
    console.error('Team fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch team' });
  }
});

router.post('/team', async (req, res) => {
  try {
    const { memberName, memberEmail, role } = req.body;
    if (!memberName) return res.status(400).json({ error: 'Member name is required' });
    const id = uuidv4();
    await db.prepare('INSERT INTO business_team (id, user_id, member_name, member_email, role) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.user.id, memberName, memberEmail || null, role || 'member');
    const member = await db.prepare('SELECT * FROM business_team WHERE id = ?').get(id);
    res.status(201).json({ member });
  } catch (err) {
    console.error('Team create error:', err);
    res.status(500).json({ error: 'Failed to add team member' });
  }
});

router.put('/team/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_team WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Team member not found' });
    const { memberName, memberEmail, role, status } = req.body;
    await db.prepare(`UPDATE business_team SET member_name = COALESCE(?, member_name), member_email = COALESCE(?, member_email), role = COALESCE(?, role), status = COALESCE(?, status) WHERE id = ?`)
      .run(memberName || null, memberEmail || null, role || null, status || null, req.params.id);
    const member = await db.prepare('SELECT * FROM business_team WHERE id = ?').get(req.params.id);
    res.json({ member });
  } catch (err) {
    console.error('Team update error:', err);
    res.status(500).json({ error: 'Failed to update team member' });
  }
});

router.delete('/team/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM business_team WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Team member not found' });
    await db.prepare('DELETE FROM business_team WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Team delete error:', err);
    res.status(500).json({ error: 'Failed to delete team member' });
  }
});

// ====== REVENUE ======
router.get('/revenue', async (req, res) => {
  try {
    const monthly = await db.prepare(`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as revenue, COUNT(*) as count
      FROM transactions WHERE status = 'released' AND created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month ASC
    `).all();
    const categoryRevenue = await db.prepare(`
      SELECT j.category, SUM(t.amount) as total, COUNT(*) as count
      FROM transactions t JOIN jobs j ON t.job_id = j.id WHERE t.status = 'released'
      GROUP BY j.category ORDER BY total DESC
    `).all();
    res.json({ revenue: { monthly, categoryRevenue, totalRevenue: monthly.reduce((s, m) => s + m.revenue, 0), totalTransactions: monthly.reduce((s, m) => s + m.count, 0) } });
  } catch (err) {
    console.error('Revenue fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch revenue data' });
  }
});

module.exports = router;
