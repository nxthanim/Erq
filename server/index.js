require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

// Import the shared Express app (middleware + routes)
const app = require('./app');
const { initializeDatabase } = require('./models/schema');
const { setupSocket } = require('./socket');

const server = http.createServer(app);

// ====== DYNAMIC DOMAIN CONFIGURATION ======
const DOMAIN = process.env.DOMAIN || 'gebeya.et';
const DOMAIN_WWW = `www.${DOMAIN}`;
const DOMAIN_PROTOCOL = process.env.DOMAIN_PROTOCOL || 'https';

// Ensure upload directories exist (local filesystem only)
const uploadDirs = [
  path.join(__dirname, '../uploads/profiles'),
  path.join(__dirname, '../uploads/portfolio'),
  path.join(__dirname, '../uploads/agent-files'),
];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ====== SOCKET.IO (WebSockets) ======
// Only active in self-hosted mode — not available on Vercel serverless
const ALLOWED_ORIGINS = [
  process.env.CLIENT_URL || 'http://localhost:5173',
  'http://localhost:5000',
  `${DOMAIN_PROTOCOL}://${DOMAIN}`,
  `${DOMAIN_PROTOCOL}://${DOMAIN_WWW}`,
];

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  maxHttpBufferSize: 1e6,
  pingTimeout: 5000,
  pingInterval: 10000,
});

// Initialize database (schema creation + seeding)
try {
  initializeDatabase();
} catch (err) {
  console.error('❌ Database initialization error:', err.message);
  // Don't crash — let the app handle read/write errors gracefully
}

// Setup Socket.io handlers
setupSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║           🏪 Erq Marketplace v1.0                ║
║     Ethiopian Freelance Marketplace              ║
║                                                  ║
║  🔒 Security:                                    ║
║     • Helmet headers active                      ║
║     • CORS origin validation                     ║
║     • Rate limiting (auth + API)                 ║
║     • XSS sanitization                           ║
║     • CSRF origin/referer check                  ║
║     • Brute force protection on login            ║
║     • File upload restrictions                   ║
║     • Socket.io connection limits                ║
║                                                  ║
║  Server:    http://localhost:${PORT}                  ║
║  API:       http://localhost:${PORT}/api             ║
║  Domain:    https://${DOMAIN}                    ║
╚══════════════════════════════════════════════════╝
  `);
  console.log(`📡 Subdomain proxy active for *.${DOMAIN}`);
  console.log('🛡️  All security middleware active');
});

module.exports = app;
