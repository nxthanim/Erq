const express = require('express');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { getAIResponse } = require('../utils/ai');

// Ensure upload directory exists (gracefully handle read-only serverless)
const isVercel = process.env.VERCEL === 'true';
const AGENT_UPLOAD_DIR = path.join(__dirname, '../../uploads/agent-files');
try {
  if (!fs.existsSync(AGENT_UPLOAD_DIR)) {
    fs.mkdirSync(AGENT_UPLOAD_DIR, { recursive: true });
  }
} catch (err) {
  console.warn('⚠️ Cannot create upload dir (read-only filesystem?):', err.message);
}

// Agent file upload config — accepts any common document/image type
// Use memory storage on Vercel, disk otherwise
const agentUpload = multer({
  storage: isVercel ? multer.memoryStorage() : multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/agent-files')),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${uuidv4()}${ext}`);
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExts = /jpeg|jpg|png|gif|webp|pdf|docx?|txt|csv|xlsx?|pptx?/;
    const extOk = allowedExts.test(path.extname(file.originalname).toLowerCase());
    if (extOk) return cb(null, true);
    cb(new Error('File type not supported. Allowed: images, PDF, DOC, TXT, CSV, XLS, PPT'));
  }
});

const router = express.Router();
router.use(authenticate);

// Default system agents available to all users (hardcoded to avoid FK issues)
const DEFAULT_AGENTS = [
  { id: 'agent-assistant', user_id: 'system', name: 'Erq Assistant', role: 'General Assistant', instructions: 'A helpful AI assistant for the Erq marketplace.', color: '#1a1a1a', subagent_count: 0 },
  { id: 'agent-writer', user_id: 'system', name: 'Content Writer', role: 'Content Creator', instructions: 'Specialized in writing and translation services.', color: '#444444', subagent_count: 0 },
  { id: 'agent-designer', user_id: 'system', name: 'Design Advisor', role: 'Design Consultant', instructions: 'Expert in graphic design, branding, and visual aesthetics.', color: '#666666', subagent_count: 0 },
  { id: 'agent-analyst', user_id: 'system', name: 'Data Analyst', role: 'Analytics Expert', instructions: 'Analyzes marketplace data and user performance metrics.', color: '#888888', subagent_count: 0 },
];

// ====== AGENTS CRUD ======

// GET /api/agents - List user's agents + default system agents
router.get('/', async (req, res) => {
  try {
    const userAgents = await db.prepare('SELECT * FROM user_agents WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC').all(req.user.id);

    // Attach subagent count
    const agentsWithCounts = [];
    for (const agent of userAgents) {
      const subCount = await db.prepare('SELECT COUNT(*) as count FROM user_agents WHERE parent_agent_id = ? AND is_active = 1').get(agent.id).count;
      agentsWithCounts.push({ ...agent, subagent_count: subCount });
    }

    // Combine default system agents + user's custom agents
    const allAgents = [...DEFAULT_AGENTS, ...agentsWithCounts];

    res.json({ agents: allAgents });
  } catch (err) {
    console.error('Error fetching agents:', err);
    res.status(500).json({ error: 'Failed to fetch agents' });
  }
});

// POST /api/agents - Create a new agent
router.post('/', async (req, res) => {
  try {
    const { name, role, instructions, model, avatar, color, parentAgentId } = req.body;
    if (!name) return res.status(400).json({ error: 'Agent name is required' });

    const id = uuidv4();
    await db.prepare(`
      INSERT INTO user_agents (id, user_id, name, role, instructions, model, avatar, color, parent_agent_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, name, role || 'assistant', instructions || '', model || 'default', avatar || null, color || '#1a1a1a', parentAgentId || null);

    const agent = await db.prepare('SELECT * FROM user_agents WHERE id = ?').get(id);
    res.status(201).json({ agent });
  } catch (err) {
    console.error('Error creating agent:', err);
    res.status(500).json({ error: 'Failed to create agent' });
  }
});

// PUT /api/agents/:id - Update an agent
router.put('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM user_agents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });

    const { name, role, instructions, model, avatar, color, isActive } = req.body;
    await db.prepare(`
      UPDATE user_agents SET name = COALESCE(?, name), role = COALESCE(?, role), instructions = COALESCE(?, instructions),
      model = COALESCE(?, model), avatar = COALESCE(?, avatar), color = COALESCE(?, color), is_active = COALESCE(?, is_active),
      updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(name || null, role || null, instructions || null, model || null, avatar || null, color || null, isActive !== undefined ? (isActive ? 1 : 0) : null, req.params.id);

    const agent = await db.prepare('SELECT * FROM user_agents WHERE id = ?').get(req.params.id);
    res.json({ agent });
  } catch (err) {
    console.error('Error updating agent:', err);
    res.status(500).json({ error: 'Failed to update agent' });
  }
});

// DELETE /api/agents/:id - Delete an agent
router.delete('/:id', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM user_agents WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Agent not found' });

    // Delete subagents first
    await db.prepare('DELETE FROM user_agents WHERE parent_agent_id = ?').run(req.params.id);
    // Delete conversations
    await db.prepare('DELETE FROM agent_conversations WHERE agent_id = ?').run(req.params.id);
    // Delete agent
    await db.prepare('DELETE FROM user_agents WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting agent:', err);
    res.status(500).json({ error: 'Failed to delete agent' });
  }
});

// ====== FILE UPLOAD ======

// POST /api/agents/upload - Upload a file for the agent chat (authenticate already applied by router.use above)
router.post('/upload', agentUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    if (isVercel) {
      const base64 = req.file.buffer.toString('base64');
      const dataUri = `data:${req.file.mimetype};base64,${base64}`;
      return res.json({ url: dataUri, name: req.file.originalname, size: req.file.size, type: req.file.mimetype });
    }
    
    res.json({
      url: `/uploads/agent-files/${req.file.filename}`,
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype,
    });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message || 'Failed to upload file' });
  }
});

// ====== CONVERSATIONS ======

// GET /api/agents/:agentId/conversations - List conversations for an agent
router.get('/:agentId/conversations', async (req, res) => {
  try {
    const conversations = await db.prepare(`
      SELECT c.*, (SELECT COUNT(*) FROM agent_messages WHERE conversation_id = c.id) as message_count
      FROM agent_conversations c WHERE c.agent_id = ? AND c.user_id = ? ORDER BY c.updated_at DESC
    `).all(req.params.agentId, req.user.id);
    res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// POST /api/agents/:agentId/conversations - Create a new conversation
router.post('/:agentId/conversations', async (req, res) => {
  try {
    const { title } = req.body;
    const id = uuidv4();
    await db.prepare('INSERT INTO agent_conversations (id, agent_id, user_id, title) VALUES (?, ?, ?, ?)')
      .run(id, req.params.agentId, req.user.id, title || 'New Conversation');

    const conversation = await db.prepare('SELECT * FROM agent_conversations WHERE id = ?').get(id);
    res.status(201).json({ conversation });
  } catch (err) {
    console.error('Error creating conversation:', err);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// DELETE /api/agents/:agentId/conversations/:convId - Delete a conversation
router.delete('/:agentId/conversations/:convId', async (req, res) => {
  try {
    const existing = await db.prepare('SELECT * FROM agent_conversations WHERE id = ? AND user_id = ?').get(req.params.convId, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Conversation not found' });

    await db.prepare('DELETE FROM agent_messages WHERE conversation_id = ?').run(req.params.convId);
    await db.prepare('DELETE FROM agent_conversations WHERE id = ?').run(req.params.convId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// ====== MESSAGES ======

// GET /api/agents/:agentId/conversations/:convId/messages - Get messages
router.get('/:agentId/conversations/:convId/messages', async (req, res) => {
  try {
    const messages = await db.prepare('SELECT * FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC')
      .all(req.params.convId);
    const parsedMessages = messages.map(msg => {
      // Parse metadata to extract file attachments
      let files = [];
      try {
        const meta = JSON.parse(msg.metadata || '{}');
        files = meta.files || [];
      } catch {}
      return { ...msg, files };
    });
    res.json({ messages });
  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/agents/:agentId/conversations/:convId/messages - Send a message and get AI response
router.post('/:agentId/conversations/:convId/messages', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Message content is required' });

    // Verify conversation belongs to user
    const conv = await db.prepare('SELECT * FROM agent_conversations WHERE id = ? AND user_id = ?').get(req.params.convId, req.user.id);
    if (!conv) return res.status(404).json({ error: 'Conversation not found' });

    // Get agent info - check both DB and default agents
    let agent = await db.prepare('SELECT * FROM user_agents WHERE id = ?').get(req.params.agentId);
    if (!agent) {
      // Fall back to default system agents
      agent = DEFAULT_AGENTS.find(a => a.id === req.params.agentId);
    }
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    // Parse file attachments from request
    const files = req.body.files || [];
    const metadata = JSON.stringify({ files });

    // Save user message with file metadata
    const userMsgId = uuidv4();
    await db.prepare('INSERT INTO agent_messages (id, conversation_id, role, content, metadata) VALUES (?, ?, ?, ?, ?)')
      .run(userMsgId, req.params.convId, 'user', content, metadata);

    // Update conversation title from first message
    const msgCount = (await db.prepare('SELECT COUNT(*) as count FROM agent_messages WHERE conversation_id = ?').get(req.params.convId)).count;
    if (msgCount <= 2) {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await db.prepare('UPDATE agent_conversations SET title = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(title, req.params.convId);
    } else {
      await db.prepare('UPDATE agent_conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.convId);
    }

    // Get conversation history for context
    const history = await db.prepare('SELECT role, content FROM agent_messages WHERE conversation_id = ? ORDER BY created_at ASC LIMIT 20')
      .all(req.params.convId);

    // Generate AI response using NVIDIA AI API
    let response;
    try {
      response = await getAIResponse(content, agent, history, agent.model && agent.model !== 'default' ? { model: agent.model } : {});
    } catch (apiError) {
      console.error('AI API error:', apiError.message);

      // Fallback: use template-generated greeting if API fails
      if (apiError.message?.includes('NVIDIA_API_KEY')) {
        response = fallbackResponse(agent, 'api_key_missing');
      } else {
        console.error('AI API error:', apiError.message);
        response = fallbackResponse(agent, 'error');
      }
    }

    // Save agent response
    const agentMsgId = uuidv4();
    await db.prepare('INSERT INTO agent_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)')
      .run(agentMsgId, req.params.convId, 'agent', response);

    const agentMsg = await db.prepare('SELECT * FROM agent_messages WHERE id = ?').get(agentMsgId);
    const userMsg = await db.prepare('SELECT * FROM agent_messages WHERE id = ?').get(userMsgId);

    res.status(201).json({ userMessage: userMsg, agentMessage: agentMsg });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ====== FALLBACK RESPONSE GENERATOR ======

function fallbackResponse(agent, reason, details) {
  const name = agent.name || 'Assistant';
  const role = agent.role || 'assistant';

  if (reason === 'api_key_missing') {
    return `👋 **${name}** here! I'm your ${role.toLowerCase()} on Erq.

I'm currently running in **offline mode** because no NVIDIA API key is configured yet. Here's what I can still tell you:

I'm designed to help you with freelancing, gigs, proposals, and navigating the Erq marketplace. Once an admin adds your NVIDIA API key to the server's \`.env\` file, I'll be powered by **real AI**! 🇪🇹

Until then, feel free to explore the platform features! What can I help you with?`;
  }

  return `👋 Hi there! I'm **${name}**, your ${role.toLowerCase()} on Erq.

I apologize — I'm having trouble connecting to my AI brain right now. Please try again in a moment! If the issue persists, let an admin know. 🛠️`;
}

module.exports = router;
