const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');

function setupSocket(io) {
  // Track online users
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);

    // Authenticate and join user room
    socket.on('register', (userId) => {
      if (userId) {
        onlineUsers.set(userId, socket.id);
        socket.userId = userId;
        socket.join(`user:${userId}`);
        io.emit('user:online', { userId, onlineUsers: Array.from(onlineUsers.keys()) });
        console.log(`✅ User ${userId} registered`);
      }
    });

    // Join a conversation room
    socket.on('conversation:join', ({ userId, otherUserId }) => {
      const roomId = [userId, otherUserId].sort().join(':');
      socket.join(`conversation:${roomId}`);
      console.log(`📨 Joined conversation room: ${roomId}`);
    });

    // Send message
    socket.on('message:send', async (data) => {
      try {
        const { senderId, receiverId, message, jobId, attachmentUrl, attachmentName, attachmentSize, attachmentType } = data;
        
        if (!senderId || !receiverId || (!message && !attachmentUrl)) return;

        const id = uuidv4();
        await db.prepare('INSERT INTO messages (id, sender_id, receiver_id, job_id, message, attachment_url, attachment_name, attachment_size, attachment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)')
          .run(id, senderId, receiverId, jobId || null, message || '', attachmentUrl || null, attachmentName || null, attachmentSize || null, attachmentType || null);

        const msg = await db.prepare(`
          SELECT m.*, u.full_name as sender_name, u.profile_picture as sender_picture
          FROM messages m JOIN users u ON m.sender_id = u.id WHERE m.id = $1
        `).get(id);

        // Send to receiver's room
        io.to(`user:${receiverId}`).emit('message:new', msg);

        // Send back to sender's room
        io.to(`user:${senderId}`).emit('message:sent', msg);

        // Notify receiver if online
        if (onlineUsers.has(receiverId)) {
          io.to(`user:${receiverId}`).emit('notification:new', {
            type: 'message',
            title: 'New Message',
            message: `New message from ${msg.sender_name}`
          });
        }

      } catch (err) {
        console.error('Error sending message via socket:', err);
        socket.emit('message:error', { error: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing:start', ({ userId, receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:update', { userId, isTyping: true });
    });

    socket.on('typing:stop', ({ userId, receiverId }) => {
      io.to(`user:${receiverId}`).emit('typing:update', { userId, isTyping: false });
    });

    // Mark messages as read
    socket.on('messages:read', async ({ userId, otherUserId }) => {
      await db.prepare('UPDATE messages SET read = 1 WHERE sender_id = $1 AND receiver_id = $2 AND read = 0')
        .run(otherUserId, userId);
      io.to(`user:${userId}`).emit('messages:read-confirm', { readBy: userId, fromUser: otherUserId });
    });

    // Disconnect
    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('user:offline', { userId: socket.userId });
        console.log(`🔌 User ${socket.userId} disconnected`);
      }
    });
  });
}

module.exports = { setupSocket };
