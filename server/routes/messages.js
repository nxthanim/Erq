const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists (gracefully handle read-only serverless)
const MSG_UPLOAD_DIR = path.join(__dirname, '../../uploads/chat');
try {
  if (!fs.existsSync(MSG_UPLOAD_DIR)) {
    fs.mkdirSync(MSG_UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Cannot create upload dir (read-only filesystem?):', err.message);
}

// Use memory storage on Vercel, disk otherwise
const isVercel = process.env.VERCEL === 'true';
const msgUpload = multer({
  storage: isVercel ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, MSG_UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

// POST /api/messages/upload — Upload file for message attachment
router.post('/upload', authenticate, msgUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    // On Vercel (memory storage), return base64 data URI
    if (isVercel) {
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;
      return res.json({
        url: dataUri,
        name: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
    }
    
    res.json({
      url: `/uploads/chat/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    console.error('Error uploading message file:', err);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// GET /api/messages/conversations - Get user's conversations
router.get('/conversations', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const conversations = await db.prepare(`
      SELECT DISTINCT ON (u.id)
        CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as other_user_id,
        u.full_name as other_user_name,
        u.profile_picture as other_user_picture,
        u.role as other_user_role,
        m.created_at as last_message_time,
        m.message as last_message,
        (SELECT COUNT(*) FROM messages WHERE receiver_id = $1 AND sender_id = u.id AND read = 0) as unread_count
      FROM messages m
      JOIN users u ON (CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END) = u.id
      WHERE m.sender_id = $1 OR m.receiver_id = $1
      ORDER BY u.id, m.created_at DESC
    `).all(userId);

    res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/:userId - Get messages with a specific user
router.get('/:userId', authenticate, async (req, res) => {
  try {
    const messages = await db.prepare(`
      SELECT * FROM messages 
      WHERE (sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4)
      ORDER BY created_at ASC
    `).all(req.user.id, req.params.userId, req.params.userId, req.user.id);

    // Mark received messages as read
    await db.prepare('UPDATE messages SET read = 1 WHERE sender_id = $1 AND receiver_id = $2 AND read = 0')
      .run(req.params.userId, req.user.id);

    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/messages - Send a message
router.post('/', authenticate, async (req, res) => {
  try {
    const { receiverId, message, jobId, attachmentUrl, attachmentName, attachmentSize, attachmentType } = req.body;
    if (!receiverId || (!message && !attachmentUrl)) {
      return res.status(400).json({ error: 'Receiver and message or attachment are required' });
    }

    const id = uuidv4();
    await db.prepare('INSERT INTO messages (id, sender_id, receiver_id, job_id, message, attachment_url, attachment_name, attachment_size, attachment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)')
      .run(id, req.user.id, receiverId, jobId || null, message || '', attachmentUrl || null, attachmentName || null, attachmentSize || null, attachmentType || null);

    const msg = await db.prepare('SELECT * FROM messages WHERE id = $1').get(id);
    res.status(201).json({ message: msg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/messages/unread/count
router.get('/unread/count', authenticate, async (req, res) => {
  try {
    const count = await db.prepare('SELECT COUNT(*) as count FROM messages WHERE receiver_id = $1 AND read = 0').get(req.user.id).count;
    res.json({ count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

module.exports = router;
