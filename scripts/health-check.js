#!/usr/bin/env node

/**
 * 🩺 API Health Check — pings every endpoint and reports pass/fail
 *
 * Usage:
 *   node scripts/health-check.js                # test http://localhost:5000
 *   node scripts/health-check.js https://erq.cc.cd  # test production
 *   node scripts/health-check.js --json         # JSON output for CI
 */

const http = require('http');
const https = require('https');

const BASE = process.argv[2] || 'http://localhost:5000';
const isJson = process.argv.includes('--json');
const isSecure = BASE.startsWith('https');
const requester = isSecure ? https : http;

// Parse base URL for the host header
const baseUrl = new URL(BASE);

// ====== ALL API ENDPOINTS ======
// Each entry: { method, path, auth: 'none'|'optional'|'required', expect, note }
const ENDPOINTS = [
  // ── Public (no auth) ──
  { method: 'GET', path: '/api/health', auth: 'none', expect: 200, note: 'Health check' },

  // Auth
  { method: 'POST', path: '/api/auth/signup', auth: 'none', expect: 400, note: 'Signup (no body → 400)' },
  { method: 'POST', path: '/api/auth/login', auth: 'none', expect: 400, note: 'Login (no body → 400)' },
  { method: 'POST', path: '/api/auth/forgot-password', auth: 'none', expect: 400, note: 'Forgot password' },
  { method: 'POST', path: '/api/auth/reset-password', auth: 'none', expect: 400, note: 'Reset password' },
  { method: 'POST', path: '/api/auth/verify-email', auth: 'none', expect: 400, note: 'Verify email' },

  // Users (public)
  { method: 'GET', path: '/api/users/freelancers', auth: 'none', expect: 200, note: 'List freelancers' },
  { method: 'GET', path: '/api/users/top-freelancers', auth: 'none', expect: 200, note: 'Top freelancers' },
  { method: 'GET', path: '/api/users/search?q=test', auth: 'none', expect: 401, note: 'User search (no auth)' },

  // Gigs (public)
  { method: 'GET', path: '/api/gigs', auth: 'none', expect: 200, note: 'List gigs' },
  { method: 'GET', path: '/api/gigs/trending', auth: 'none', expect: 200, note: 'Trending gigs' },
  { method: 'GET', path: '/api/gigs/popular', auth: 'none', expect: 200, note: 'Popular gigs' },

  // Jobs (public)
  { method: 'GET', path: '/api/jobs', auth: 'none', expect: 200, note: 'List jobs' },

  // Categories (public)
  { method: 'GET', path: '/api/categories', auth: 'none', expect: 200, note: 'List categories' },

  // Features (public)
  { method: 'GET', path: '/api/features/skill-badges/nonexistent', auth: 'none', expect: 200, note: 'Skill badges' },
  { method: 'GET', path: '/api/features/portfolio/nonexistent', auth: 'none', expect: 200, note: 'Portfolio' },
  { method: 'GET', path: '/api/features/activity-feed', auth: 'none', expect: 200, note: 'Activity feed' },
  { method: 'GET', path: '/api/features/referral/lookup/test', auth: 'none', expect: 404, note: 'Referral lookup' },

  // Reviews (public)
  { method: 'GET', path: '/api/reviews/user/nonexistent', auth: 'none', expect: 200, note: 'User reviews' },

  // Wallet
  { method: 'GET', path: '/api/wallet/overview', auth: 'none', expect: 401, note: 'Wallet overview (requires auth)' },
  { method: 'GET', path: '/api/wallet/transactions', auth: 'none', expect: 401, note: 'Wallet transactions (requires auth)' },

  // Orders (auth required)
  { method: 'GET', path: '/api/orders', auth: 'none', expect: 401, note: 'List orders (requires auth)' },

  // Users (auth required)
  { method: 'GET', path: '/api/users/online-status?userIds=test', auth: 'none', expect: 401, note: 'Online status (no auth)' },
  { method: 'PUT', path: '/api/users/profile-picture', auth: 'none', expect: 401, note: 'Profile pic (no auth)' },

  // Auth required — expect 401 (route exists, auth middleware protects it)
  { method: 'GET', path: '/api/auth/me', auth: 'none', expect: 401, note: 'Auth me' },
  { method: 'GET', path: '/api/auth/verification-status/test@test.com', auth: 'none', expect: 401, note: 'Verification status' },
  { method: 'PUT', path: '/api/auth/profile', auth: 'none', expect: 401, note: 'Update profile' },
  { method: 'GET', path: '/api/messages/conversations', auth: 'none', expect: 401, note: 'Conversations' },
  { method: 'GET', path: '/api/features/notifications', auth: 'none', expect: 401, note: 'Notifications' },
  { method: 'GET', path: '/api/features/dashboard', auth: 'none', expect: 401, note: 'Dashboard' },
  { method: 'GET', path: '/api/features/saved-gigs', auth: 'none', expect: 401, note: 'Saved gigs' },
  { method: 'GET', path: '/api/features/disputes', auth: 'none', expect: 401, note: 'Disputes' },
  { method: 'GET', path: '/api/features/referral/stats', auth: 'none', expect: 401, note: 'Referral stats' },
  { method: 'POST', path: '/api/orders', auth: 'none', expect: 401, note: 'Create order (no auth)' },

  // Payments
  { method: 'GET', path: '/api/payments/transactions', auth: 'none', expect: 401, note: 'Payment transactions' },
  { method: 'POST', path: '/api/payments/chapa/verify', auth: 'none', expect: 401, note: 'Chapa verify' },

  // User Analytics
  { method: 'GET', path: '/api/user/analytics/overview', auth: 'none', expect: 401, note: 'User analytics overview (requires auth)' },
  { method: 'GET', path: '/api/user/analytics/gigs', auth: 'none', expect: 401, note: 'User analytics gigs (requires auth)' },
  { method: 'GET', path: '/api/user/analytics/earnings', auth: 'none', expect: 401, note: 'User analytics earnings (requires auth)' },
  { method: 'GET', path: '/api/user/analytics/messages', auth: 'none', expect: 401, note: 'User analytics messages (requires auth)' },
  { method: 'GET', path: '/api/user/analytics/jobs', auth: 'none', expect: 401, note: 'User analytics jobs (requires auth)' },

  // Business
  { method: 'GET', path: '/api/business/overview', auth: 'none', expect: 401, note: 'Business overview (no auth)' },
  { method: 'GET', path: '/api/business/customers', auth: 'none', expect: 401, note: 'Business customers' },
  { method: 'GET', path: '/api/business/meetings', auth: 'none', expect: 401, note: 'Business meetings' },
  { method: 'GET', path: '/api/business/invoices', auth: 'none', expect: 401, note: 'Business invoices' },
  { method: 'GET', path: '/api/business/team', auth: 'none', expect: 401, note: 'Business team' },
  { method: 'GET', path: '/api/business/revenue', auth: 'none', expect: 401, note: 'Business revenue' },
  { method: 'GET', path: '/api/business/competitors', auth: 'none', expect: 401, note: 'Business competitors' },

  // Admin
  { method: 'GET', path: '/api/admin/stats', auth: 'none', expect: 401, note: 'Admin stats' },
  { method: 'GET', path: '/api/admin/users', auth: 'none', expect: 401, note: 'Admin users' },
  { method: 'GET', path: '/api/admin/gigs', auth: 'none', expect: 401, note: 'Admin gigs' },
  { method: 'GET', path: '/api/admin/jobs', auth: 'none', expect: 401, note: 'Admin jobs' },
  { method: 'GET', path: '/api/admin/transactions', auth: 'none', expect: 401, note: 'Admin transactions' },
  { method: 'GET', path: '/api/admin/analytics', auth: 'none', expect: 401, note: 'Admin analytics' },
  { method: 'GET', path: '/api/admin/reviews', auth: 'none', expect: 401, note: 'Admin reviews' },
  { method: 'GET', path: '/api/admin/notifications', auth: 'none', expect: 401, note: 'Admin notifications' },
  { method: 'GET', path: '/api/admin/biometric-evidence', auth: 'none', expect: 401, note: 'Admin biometric' },
  { method: 'GET', path: '/api/admin/audit/login', auth: 'none', expect: 401, note: 'Admin login audit' },
  { method: 'GET', path: '/api/admin/audit/payment', auth: 'none', expect: 401, note: 'Admin payment audit' },

  // AI
  { method: 'POST', path: '/api/ai/chat', auth: 'none', expect: 401, note: 'AI chat' },
  { method: 'GET', path: '/api/ai/recommendations', auth: 'none', expect: 401, note: 'AI recommendations' },

  // Agents
  { method: 'GET', path: '/api/agents', auth: 'none', expect: 401, note: 'List agents (requires auth)' },

  // Gigs with auth
  { method: 'POST', path: '/api/gigs', auth: 'none', expect: 401, note: 'Create gig' },
  { method: 'PUT', path: '/api/gigs/nonexistent', auth: 'none', expect: 401, note: 'Update gig' },
  { method: 'DELETE', path: '/api/gigs/nonexistent', auth: 'none', expect: 401, note: 'Delete gig' },

  // ── Public routes with :id params ──
  { method: 'GET', path: '/api/gigs/test-id', auth: 'none', expect: 404, note: 'Get gig by ID (not found)' },
  { method: 'GET', path: '/api/jobs/test-id', auth: 'none', expect: 404, note: 'Get job by ID (not found)' },
  { method: 'GET', path: '/api/users/test-id', auth: 'none', expect: 404, note: 'Get user by ID (not found)' },
  { method: 'GET', path: '/api/orders/test-id', auth: 'none', expect: 401, note: 'Get order by ID (auth)' },

  // Jobs with auth
  { method: 'POST', path: '/api/jobs', auth: 'none', expect: 401, note: 'Create job' },
  { method: 'POST', path: '/api/jobs/test-id/bid', auth: 'none', expect: 401, note: 'Bid on job' },
  { method: 'PUT', path: '/api/jobs/test-id/award', auth: 'none', expect: 401, note: 'Award job' },
  { method: 'PUT', path: '/api/jobs/test-id/status', auth: 'none', expect: 401, note: 'Update job status' },
  { method: 'DELETE', path: '/api/jobs/test-id', auth: 'none', expect: 401, note: 'Delete job' },

  // Orders with auth
  { method: 'PUT', path: '/api/orders/nonexistent/accept', auth: 'none', expect: 401, note: 'Accept order' },
  { method: 'PUT', path: '/api/orders/nonexistent/deliver', auth: 'none', expect: 401, note: 'Deliver order' },
  { method: 'PUT', path: '/api/orders/nonexistent/complete', auth: 'none', expect: 401, note: 'Complete order' },
  { method: 'PUT', path: '/api/orders/nonexistent/cancel', auth: 'none', expect: 401, note: 'Cancel order' },
  { method: 'PUT', path: '/api/orders/nonexistent/dispute', auth: 'none', expect: 401, note: 'Dispute order' },

  // Messages with auth
  { method: 'GET', path: '/api/messages/test-user-id', auth: 'none', expect: 401, note: 'Get messages for user' },
  { method: 'GET', path: '/api/messages/unread/count', auth: 'none', expect: 401, note: 'Unread count' },
  { method: 'POST', path: '/api/messages', auth: 'none', expect: 401, note: 'Send message' },

  // Payments with auth
  { method: 'POST', path: '/api/payments/initiate', auth: 'none', expect: 401, note: 'Initiate payment' },
  { method: 'POST', path: '/api/payments/confirm', auth: 'none', expect: 401, note: 'Confirm payment' },
  { method: 'POST', path: '/api/payments/release', auth: 'none', expect: 401, note: 'Release payment' },
  { method: 'POST', path: '/api/payments/dispute', auth: 'none', expect: 401, note: 'Dispute payment' },
  { method: 'POST', path: '/api/payments/chapa/initiate', auth: 'none', expect: 401, note: 'Chapa initiate' },
  { method: 'POST', path: '/api/payments/verify-receipt', auth: 'none', expect: 401, note: 'Verify receipt' },
  { method: 'POST', path: '/api/payments/confirm-biometric', auth: 'none', expect: 401, note: 'Confirm biometric' },

  // AI with auth
  { method: 'POST', path: '/api/ai/generate-gig', auth: 'none', expect: 401, note: 'AI generate gig' },
  { method: 'POST', path: '/api/ai/smart-match', auth: 'none', expect: 401, note: 'AI smart match' },
  { method: 'POST', path: '/api/ai/generate-image', auth: 'none', expect: 401, note: 'AI generate image' },
  { method: 'POST', path: '/api/ai/generate-image-txt2img', auth: 'none', expect: 401, note: 'AI txt2img' },

  // Features — saved gigs
  { method: 'POST', path: '/api/features/saved-gigs/test-id', auth: 'none', expect: 401, note: 'Toggle saved gig' },
  { method: 'GET', path: '/api/features/saved-gigs/check/test-id', auth: 'none', expect: 401, note: 'Check saved gig' },

  // Features — disputes
  { method: 'POST', path: '/api/features/disputes', auth: 'none', expect: 401, note: 'Create dispute' },
  { method: 'PUT', path: '/api/features/disputes/test-id/evidence', auth: 'none', expect: 401, note: 'Add dispute evidence' },
  { method: 'PUT', path: '/api/features/disputes/test-id/status', auth: 'none', expect: 401, note: 'Update dispute status' },

  // Features — portfolio
  { method: 'POST', path: '/api/features/portfolio', auth: 'none', expect: 401, note: 'Add portfolio item' },
  { method: 'DELETE', path: '/api/features/portfolio/test-id', auth: 'none', expect: 401, note: 'Delete portfolio item' },

  // Features — referrals
  { method: 'POST', path: '/api/features/referral/generate', auth: 'none', expect: 401, note: 'Generate referral' },
  { method: 'POST', path: '/api/features/referral/redeem', auth: 'none', expect: 401, note: 'Redeem referral' },

  // Features — skill badges
  { method: 'POST', path: '/api/features/skill-badges', auth: 'none', expect: 401, note: 'Create skill badge' },
  { method: 'DELETE', path: '/api/features/skill-badges/test-id', auth: 'none', expect: 401, note: 'Delete skill badge' },

  // Agents
  { method: 'POST', path: '/api/agents', auth: 'none', expect: 401, note: 'Create agent' },
  { method: 'PUT', path: '/api/agents/test-id', auth: 'none', expect: 401, note: 'Update agent' },
  { method: 'DELETE', path: '/api/agents/test-id', auth: 'none', expect: 401, note: 'Delete agent' },

  // Wallet
  { method: 'GET', path: '/api/wallet/pin-status', auth: 'none', expect: 401, note: 'Wallet PIN status' },
  { method: 'POST', path: '/api/wallet/pin-attempt', auth: 'none', expect: 401, note: 'Wallet PIN attempt' },

  // Categories with auth
  { method: 'POST', path: '/api/categories', auth: 'none', expect: 401, note: 'Create category' },
  { method: 'PUT', path: '/api/categories/nonexistent', auth: 'none', expect: 401, note: 'Update category' },
  { method: 'DELETE', path: '/api/categories/nonexistent', auth: 'none', expect: 401, note: 'Delete category' },
];

// ====== RUN ======
let passed = 0;
let failed = 0;
const results = [];

function request(method, path) {
  return new Promise((resolve) => {
    const options = {
      hostname: baseUrl.hostname,
      port: baseUrl.port || (isSecure ? 443 : 80),
      path: path.startsWith('/') ? path : '/' + path,
      method,
      timeout: 10000,
      headers: { 'User-Agent': 'HealthCheck/1.0' },
    };

    const req = requester.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, body: body.slice(0, 200) });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'Timeout' });
    });

    req.end();
  });
}

(async () => {
  console.log(`\n  🩺 API Health Check — ${BASE}\n`);
  console.log(`  ${'METHOD'.padEnd(8)} ${'STATUS'.padEnd(8)} ${'EXPECT'.padEnd(8)} ${'ENDPOINT'.padEnd(50)} ${'NOTE'}`);
  console.log(`  ${''.padEnd(8,'─')} ${''.padEnd(8,'─')} ${''.padEnd(8,'─')} ${''.padEnd(50,'─')} ${''.padEnd(20,'─')}`);

  for (const ep of ENDPOINTS) {
    const result = await request(ep.method, ep.path);
    const ok = result.error
      ? false
      : result.status === ep.expect;

    const statusStr = result.error ? 'ERR' : String(result.status);
    const icon = ok ? '✅' : '❌';
    const statusColor = ok ? statusStr : `\x1b[31m${statusStr}\x1b[0m`;

    if (ok) passed++;
    else failed++;

    results.push({ ...ep, actual: result.status, error: result.error, ok });

    if (!isJson) {
      console.log(
        `  ${icon} ${ep.method.padEnd(6)} ${String(result.status || 'ERR').padEnd(7)} ${String(ep.expect).padEnd(7)} ${ep.path.padEnd(50)} ${ep.note}`
      );
      if (result.error) {
        console.log(`     └─ ⚠ ${result.error}`);
      }
    }
  }

  // Summary
  const total = ENDPOINTS.length;
  console.log(`\n  ${'─'.repeat(80)}`);
  console.log(`  📊 Results: ${passed}/${total} passed, ${failed} failed (${Math.round(passed/total*100)}%)\n`);

  if (isJson) {
    console.log(JSON.stringify({ base: BASE, total, passed, failed, results }, null, 2));
  }

  process.exit(failed > 0 ? 1 : 0);
})();
