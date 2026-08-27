-- ============================================================================
-- Erq Marketplace â€” PostgreSQL Schema Migration
-- Run this script against your Vercel Postgres (or Neon) database to create
-- all tables, indexes, and seed data required by the application.
-- 
-- Usage:
--   psql "$POSTGRES_URL" -f scripts/migration.sql
--   OR through Vercel CLI: vercel db push
-- ============================================================================

-- Enable UUID extension (for uuid_generate_v4())
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  city TEXT,
  role TEXT NOT NULL CHECK(role IN ('client', 'freelancer', 'admin')),
  profile_picture TEXT,
  bio TEXT,
  skills TEXT,
  verified INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  review_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Idempotent: add clerk_id to existing deployments (safe to re-run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT;

-- ============================================================================
-- GIGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS gigs (
  id TEXT PRIMARY KEY,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Translation', 'Graphic Design', 'Video Editing', 'Web Development', 'Virtual Assistant', 'Social Media Management')),
  delivery_time INTEGER NOT NULL,
  portfolio_images TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- JOBS
-- ============================================================================
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget_min REAL NOT NULL,
  budget_max REAL NOT NULL,
  category TEXT NOT NULL,
  deadline TIMESTAMP,
  status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'delivered', 'completed', 'cancelled')),
  awarded_to TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- BIDS
-- ============================================================================
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  proposal TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id TEXT REFERENCES jobs(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  attachment_type TEXT,
  read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'escrow' CHECK(status IN ('escrow', 'confirmed', 'released', 'refunded', 'disputed')),
  telebirr_reference TEXT,
  confirmation_selfie TEXT,
  confirmation_audio TEXT,
  confirmed_at TIMESTAMP,
  order_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  reviewer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewee_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  role TEXT NOT NULL CHECK(role IN ('client', 'freelancer')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SAVED GIGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS saved_gigs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, gig_id)
);

-- ============================================================================
-- EMAIL VERIFICATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  email_address TEXT NOT NULL,
  suggested_correction TEXT,
  status TEXT DEFAULT 'pending',
  status_detail TEXT,
  is_format_valid INTEGER DEFAULT 0,
  is_smtp_valid INTEGER DEFAULT 0,
  is_mx_valid INTEGER DEFAULT 0,
  mx_records TEXT DEFAULT '[]',
  email_provider_name TEXT,
  organization_name TEXT,
  organization_type TEXT,
  domain TEXT,
  domain_age INTEGER,
  is_live_site INTEGER DEFAULT 0,
  registrar TEXT,
  date_registered TEXT,
  date_last_renewed TEXT,
  date_expires TEXT,
  score REAL DEFAULT 0,
  is_free_email INTEGER DEFAULT 0,
  is_disposable INTEGER DEFAULT 0,
  is_catchall INTEGER DEFAULT 0,
  is_role INTEGER DEFAULT 0,
  is_dmarc_enforced INTEGER DEFAULT 0,
  is_spf_strict INTEGER DEFAULT 0,
  address_risk_status TEXT DEFAULT 'unknown',
  domain_risk_status TEXT DEFAULT 'unknown',
  total_breaches INTEGER DEFAULT 0,
  date_first_breached TEXT,
  date_last_breached TEXT,
  verified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SKILL BADGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS skill_badges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  skill TEXT NOT NULL,
  badge_type TEXT NOT NULL CHECK(badge_type IN ('verified', 'pro', 'top_rated', 'rising_talent')),
  issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- ============================================================================
-- GIG VIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS gig_views (
  id TEXT PRIMARY KEY,
  gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  viewer_ip TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- DISPUTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  raised_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  description TEXT,
  evidence TEXT DEFAULT '[]',
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'resolved_client', 'resolved_freelancer', 'resolved_split')),
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- REFERRALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY,
  referrer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referral_code TEXT UNIQUE NOT NULL,
  total_signups INTEGER DEFAULT 0,
  total_earned REAL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS referral_signups (
  id TEXT PRIMARY KEY,
  referral_id TEXT NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
  referred_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bonus_given INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PORTFOLIO ITEMS
-- ============================================================================
CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT NOT NULL,
  tags TEXT DEFAULT '[]',
  category TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ORDERS (Gig Purchases with Escrow)
-- ============================================================================
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  gig_id TEXT NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  requirements TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed')),
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ORDER DELIVERIES (freelancer uploads files when delivering)
-- ============================================================================
CREATE TABLE IF NOT EXISTS order_deliveries (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  files TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON order_deliveries(order_id);

-- ============================================================================
-- TIPS (fan tips / buy-a-coffee â€” creator economy feature)
-- ============================================================================
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id);

-- ============================================================================
-- JOB DELIVERIES (freelancer uploads files when delivering for custom job postings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS job_deliveries (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  files TEXT DEFAULT '[]',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_job_deliveries_job ON job_deliveries(job_id);

-- ============================================================================
-- PAYMENT RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK(item_type IN ('gig', 'job')),
  item_id TEXT NOT NULL,
  amount REAL NOT NULL,
  receipt_photo TEXT NOT NULL,
  receipt_reference TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'suspicious', 'rejected')),
  risk_score REAL DEFAULT 0,
  risk_factors TEXT DEFAULT '[]',
  admin_notified INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP
);

-- ============================================================================
-- LOGIN AUDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  action TEXT NOT NULL CHECK(action IN ('login', 'signup', 'logout', 'failed_login')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PAYMENT AUDIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_audit (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK(action IN ('biometric_attempt', 'biometric_success', 'receipt_verification', 'payment_release', 'payment_dispute')),
  ip_address TEXT,
  user_agent TEXT,
  details TEXT DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PASSWORD RESETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CATEGORIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT DEFAULT 'ðŸ“‹',
  description TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- BUSINESS DASHBOARD TABLES
-- ============================================================================
CREATE TABLE IF NOT EXISTS business_customers (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'lead')),
  total_spent REAL DEFAULT 0,
  projects_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_meetings (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES business_customers(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  date TIMESTAMP NOT NULL,
  duration INTEGER DEFAULT 30,
  status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
  meeting_type TEXT DEFAULT 'video' CHECK(meeting_type IN ('video', 'phone', 'in_person')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_invoices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id TEXT REFERENCES business_customers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date TIMESTAMP,
  paid_date TIMESTAMP,
  line_items TEXT DEFAULT '[]',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS business_team (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  member_email TEXT,
  role TEXT DEFAULT 'member',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- USER AI AGENTS & SUBAGENTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_agents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'assistant',
  instructions TEXT DEFAULT '',
  model TEXT DEFAULT 'default',
  avatar TEXT,
  color TEXT DEFAULT '#16a34a',
  parent_agent_id TEXT REFERENCES user_agents(id) ON DELETE SET NULL,
  is_active INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_conversations (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL REFERENCES user_agents(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agent_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES agent_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK(role IN ('user', 'agent', 'system')),
  content TEXT NOT NULL,
  metadata TEXT DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEXES (for performance)
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_gigs_freelancer ON gigs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer ON bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_messages_participants ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_transactions_job ON transactions(job_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_gigs_user ON saved_gigs(user_id);
CREATE INDEX IF NOT EXISTS idx_skill_badges_user ON skill_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_gig_views_gig ON gig_views(gig_id);
CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_signups_referral ON referral_signups(referral_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer ON orders(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_login_audit_email ON login_audit(email);
CREATE INDEX IF NOT EXISTS idx_login_audit_created ON login_audit(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON payment_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_audit_txn ON payment_audit(transaction_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);
CREATE INDEX IF NOT EXISTS idx_business_customers_user ON business_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_business_meetings_user ON business_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_business_invoices_user ON business_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_business_team_user ON business_team(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);
CREATE INDEX IF NOT EXISTS idx_user_agents_parent ON user_agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent ON agent_conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);
-- Hot-path indexes added during hardening (wallet queries, payment flows)
CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_freelancer ON transactions(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_orders_transaction ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_user ON payment_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_reference ON payment_receipts(receipt_reference);
CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id);
CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id);
CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id);

-- ============================================================================

-- Seed data intentionally omitted; the application must not create mock users, agents, or orders.
