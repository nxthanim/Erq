const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/categories - List all active categories (public)
router.get('/', async (req, res) => {
  try {
    const categories = await db.prepare('SELECT * FROM categories WHERE active = 1 ORDER BY sort_order ASC, name ASC').all();
    res.json({ categories });
  } catch (err) {
    console.error('Error listing categories:', err);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// GET /api/categories/all - List all categories including inactive (admin only)
router.get('/all', authenticate, authorize('admin'), async (req, res) => {
  try {
    const categories = await db.prepare('SELECT * FROM categories ORDER BY sort_order ASC, name ASC').all();
    res.json({ categories });
  } catch (err) {
    console.error('Error listing all categories:', err);
    res.status(500).json({ error: 'Failed to list categories' });
  }
});

// POST /api/categories - Create a new category (admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { name, icon, description, sortOrder } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    // Check for duplicate
    const existing = await db.prepare('SELECT id FROM categories WHERE name = ?').get(name.trim());
    if (existing) {
      return res.status(409).json({ error: 'Category with this name already exists' });
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO categories (id, name, icon, description, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(id, name.trim(), icon || '📋', description || '', sortOrder || 0);

    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json({ category });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// PUT /api/categories/:id - Update a category (admin only)
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, icon, description, sortOrder, active } = req.body;

    // Check for duplicate name if name changed
    if (name && name.trim() !== category.name) {
      const existing = await db.prepare('SELECT id FROM categories WHERE name = ? AND id != ?').get(name.trim(), req.params.id);
      if (existing) {
        return res.status(409).json({ error: 'Category with this name already exists' });
      }
    }

    await db.prepare(`UPDATE categories SET 
      name = COALESCE(?, name), 
      icon = COALESCE(?, icon), 
      description = COALESCE(?, description), 
      sort_order = COALESCE(?, sort_order),
      active = COALESCE(?, active),
      updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?`)
      .run(
        name?.trim() || null,
        icon || null,
        description || null,
        sortOrder !== undefined ? sortOrder : null,
        active !== undefined ? (active ? 1 : 0) : null,
        req.params.id
      );

    const updated = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    res.json({ category: updated });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE /api/categories/:id - Delete a category (admin only)
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const category = await db.prepare('SELECT * FROM categories WHERE id = ?').get(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Instead of deleting, set active to 0 (soft delete)
    await db.prepare('UPDATE categories SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'Category deactivated' });
  } catch (err) {
    console.error('Error deleting category:', err);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
