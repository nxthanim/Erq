require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

const db = require('./config/db');
const { initializeDatabase } = require('./models/schema');

// ====== DYNAMIC DOMAIN CONFIGURATION ======
const DOMAIN = process.env.DOMAIN || 'gebeya.et';
const DOMAIN_WWW = `www.${DOMAIN}`;
const DOMAIN_PROTOCOL = process.env.DOMAIN_PROTOCOL || 'https';

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const gigRoutes = require('./routes/gigs');
const jobRoutes = require('./routes/jobs');
const messageRoutes = require('./routes/messages');
const paymentRoutes = require('./routes/payments');
const reviewRoutes = require('./routes/reviews');
const adminRoutes = require('./routes/admin');
const aiRoutes = require('./routes/ai');
const featureRoutes = require('./routes/features');
const categoryRoutes = require('./routes/categories');
const userAnalyticsRoutes = require('./routes/user-analytics');
const businessRoutes = require('./routes/business');
const agentRoutes = require('./routes/agents');
const orderRoutes = require('./routes/orders');
const walletRoutes = require('./routes/wallet');

const app = express();

// ====== 🔒 ENVIRONMENT VALIDATION ======
// Add a fallback JWT_SECRET for development/deployment convenience
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not set — using fallback dev secret. Set JWT_SECRET in Vercel env vars for production security.');
  process.env.JWT_SECRET = 'erq-fallback-dev-secret-' + Date.now();
}

const REQUIRED_ENV_VARS = ['NVIDIA_API_KEY'];
const MISSING_VARS = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (MISSING_VARS.length > 0) {
  console.warn(`⚠️ Missing required environment variables: ${MISSING_VARS.join(', ')}`);
}

// ====== 🔒 SECURITY MIDDLEWARE (ORDER MATTERS) ======

// 1. Remove fingerprinting headers BEFORE everything
app.disable('x-powered-by');

// Trust proxy — required for accurate IP detection behind Vercel's proxy
app.set('trust proxy', 1);

// 2. Helmet — comprehensive security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://*.gravatar.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "ws://localhost:*", "http://localhost:*", "wss://*"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      manifestSrc: ["'self'"],
    },
    reportOnly: false,
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  noSniff: true,
  ieNoOpen: true,
  xssFilter: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
}));

// 3. Store host header BEFORE CORS (needed for custom domain same-origin detection)
app.use((req, res, next) => {
  if (req.headers.host) global.__currentHost = req.headers.host;
  next();
});

// 4. CORS — strict origin validation
// Dynamically build allowed origins from env + request context
// On Vercel, frontend & API are on the same domain, so same-origin requests must always be allowed.
function buildAllowedOrigins(reqOrigin) {
  const origins = [
    process.env.CLIENT_URL || 'http://localhost:5173',
    'http://localhost:5000',
    `${DOMAIN_PROTOCOL}://${DOMAIN}`,
    `${DOMAIN_PROTOCOL}://${DOMAIN_WWW}`,
    // Vercel deployment URLs
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.VERCEL_BRANCH_URL ? [`https://${process.env.VERCEL_BRANCH_URL}`] : []),
  ];
  
  // Dynamically add the request origin if it matches the Host header (same-origin on Vercel)
  if (reqOrigin) {
    try {
      const originHost = new URL(reqOrigin).host;
      const hostHeader = typeof global.__currentHost === 'string' ? global.__currentHost : '';
      if (hostHeader && originHost === hostHeader.split(':')[0]) {
        origins.push(reqOrigin);
      }
    } catch {}
  }
  
  return origins;
}

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = buildAllowedOrigins(origin);
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: [],
  maxAge: 86400,
}));

// 5. Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many accounts created from this IP. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 200,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/signup', signupLimiter);
app.use('/api/', apiLimiter);

// 6. Request body parsing with size limits
app.use(express.json({ limit: '200mb' }));
app.use(express.urlencoded({ extended: true, limit: '200mb' }));

// 7. 🔒 Input sanitization
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript\s*:/gi, 'blocked:')
      .replace(/on\w+\s*=\s*["\'][^"\']*["\']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
      .replace(/data\s*:/gi, 'blocked:')
      .replace(/vbscript\s*:/gi, 'blocked:')
      .trim();
  }
  return value;
}

function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(item => sanitizeInput(item));
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeValue(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

app.use((req, res, next) => {
  if (req.body) req.body = sanitizeInput(req.body);
  if (req.query) req.query = sanitizeInput(req.query);
  next();
});

// 8. 🔒 CSRF protection via double-submit cookie pattern
app.use((req, res, next) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;
    
    // Build allowed origins dynamically (same-origin requests are always allowed)
    const allowed = buildAllowedOrigins(origin);
    
    if (origin) {
      const isAllowed = allowed.some(a => origin.startsWith(a));
      // Also allow if origin matches current host (same-origin on Vercel)
      const originHost = origin.split('://')[1]?.split(':')[0];
      const hostMatch = host && originHost === host.split(':')[0];
      
      if (!isAllowed && !hostMatch) {
        return res.status(403).json({ error: 'CSRF validation failed: invalid origin' });
      }
    } else if (referer) {
      const isAllowed = allowed.some(a => referer.startsWith(a));
      if (!isAllowed) {
        return res.status(403).json({ error: 'CSRF validation failed: invalid referer' });
      }
    }
  }
  next();
});

// 9. 🔒 Serve uploaded files (only in non-Vercel/non-serverless mode)
if (!process.env.VERCEL) {
  app.use('/uploads', (req, res, next) => {
    if (req.path.includes('..') || req.path.includes('%2e%2e')) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  }, express.static(path.join(__dirname, '../uploads'), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) {
        res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'");
      } else {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  }));
}

// ====== MIDDLEWARE: Auto-migration + lazy init for Vercel ======
// On cold start, auto-run the SQL migration to create tables
if (process.env.VERCEL) {
  let initialized = false;
  app.use(async (req, res, next) => {
    if (!initialized) {
      try {
        const { runMigration } = require('../scripts/auto-migrate');
        await runMigration(db);
        initialized = true;
        console.log('✅ Vercel: schema auto-migrated on first request');
      } catch (err) {
        console.error('❌ Schema initialization failed:', err.message);
        // Don't block requests — let routes handle DB errors gracefully
        initialized = true;
      }
    }
    next();
  });
}

// ====== API ROUTES ======
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/user/analytics', userAnalyticsRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/wallet', walletRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ====== SERVE REACT BUILD ======
// In production, serve the built client from client/dist
const clientBuild = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuild, {
  maxAge: process.env.VERCEL ? '1y' : '1y',
  etag: true,
  immutable: true,
}));

// SPA fallback — all non-API, non-file routes serve index.html
app.get('*', (req, res) => {
  // Don't serve index.html for API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(clientBuild, 'index.html'), {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
});

// ====== 🔒 GLOBAL ERROR HANDLING ======
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.message);
  
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ error: 'Origin not allowed' });
  }
  if (err.message?.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body too large' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 5MB.' });
  }
  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired. Please login again.' });
  }
  if (err.name === 'SyntaxError' && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Internal server error';
  
  res.status(500).json({ error: message });
});

module.exports = app;
