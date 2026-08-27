-- Otr Gebeya / Supabase PostgreSQL schema
--
-- This schema is compatible with the current application, which uses text IDs
-- containing UUID strings plus a few system IDs such as 'system' and
-- 'agent-assistant'. The backend should use the Supabase service/secret key;
-- never put that key in VITE_* client variables.
--
-- Run this in Supabase SQL Editor or with psql against the project database.
-- It creates tables only; it does not delete existing data.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- Users, profiles, categories, and marketplace listings
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  clerk_id text UNIQUE,
  email text UNIQUE NOT NULL,
  password text,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'freelancer', 'admin')),
  phone text,
  city text,
  profile_picture text,
  bio text,
  skills text,
  verified integer NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
  rating numeric(3, 2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count integer NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  wallet_balance numeric(14, 2) NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  last_active_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.categories (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  icon text DEFAULT '📋',
  description text DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gigs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  freelancer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  price numeric(14, 2) NOT NULL CHECK (price >= 0),
  category text NOT NULL,
  delivery_time integer NOT NULL DEFAULT 1 CHECK (delivery_time > 0),
  portfolio_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  active integer NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  views integer NOT NULL DEFAULT 0 CHECK (views >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.jobs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  budget_min numeric(14, 2) NOT NULL DEFAULT 0 CHECK (budget_min >= 0),
  budget_max numeric(14, 2) NOT NULL DEFAULT 0 CHECK (budget_max >= budget_min),
  category text NOT NULL,
  deadline timestamptz,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled', 'closed')),
  awarded_to text REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bids (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  delivery_time integer NOT NULL DEFAULT 1 CHECK (delivery_time > 0),
  cover_letter text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_id, freelancer_id)
);

-- ============================================================
-- Orders, delivery, transactions, payments, and wallet
-- ============================================================

CREATE TABLE IF NOT EXISTS public.transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  client_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  freelancer_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  gig_id text REFERENCES public.gigs(id) ON DELETE SET NULL,
  job_id text REFERENCES public.jobs(id) ON DELETE SET NULL,
  amount numeric(14, 2) NOT NULL CHECK (amount >= 0),
  fee numeric(14, 2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'held', 'released', 'completed', 'cancelled', 'disputed', 'refunded')),
  payment_method text,
  payment_reference text,
  job_title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.orders (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id text REFERENCES public.transactions(id) ON DELETE SET NULL,
  gig_id text REFERENCES public.gigs(id) ON DELETE SET NULL,
  job_id text REFERENCES public.jobs(id) ON DELETE SET NULL,
  client_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  freelancer_id text NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title text NOT NULL DEFAULT '',
  requirements text,
  price numeric(14, 2) NOT NULL CHECK (price >= 0),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'pending', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed')),
  due_date timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.order_deliveries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id text NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.job_deliveries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  job_id text NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  freelancer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.payment_receipts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id text REFERENCES public.transactions(id) ON DELETE SET NULL,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receipt_reference text UNIQUE,
  amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  provider text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  receipt_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(14, 2) NOT NULL,
  type text NOT NULL CHECK (type IN ('credit', 'debit', 'hold', 'release', 'refund', 'fee')),
  status text NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Messaging, reviews, notifications, saved gigs, and portfolio
-- ============================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read integer NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id text REFERENCES public.transactions(id) ON DELETE SET NULL,
  gig_id text REFERENCES public.gigs(id) ON DELETE SET NULL,
  reviewer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reviewee_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  read integer NOT NULL DEFAULT 0 CHECK (read IN (0, 1)),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.saved_gigs (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  gig_id text NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, gig_id)
);

CREATE TABLE IF NOT EXISTS public.portfolio_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  media_url text,
  media_type text DEFAULT 'image' CHECK (media_type IN ('image', 'video', 'document', 'link')),
  external_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gig_views (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  gig_id text NOT NULL REFERENCES public.gigs(id) ON DELETE CASCADE,
  viewer_id text REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- AI agents and AI Store Builder drafts
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_agents (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'General Assistant',
  instructions text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'default',
  avatar text,
  color text DEFAULT '#1f6f5c',
  parent_agent_id text REFERENCES public.user_agents(id) ON DELETE SET NULL,
  is_active integer DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_conversations (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id text NOT NULL REFERENCES public.user_agents(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'New Conversation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agent_messages (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id text NOT NULL REFERENCES public.agent_conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'agent', 'assistant', 'system')),
  content text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_drafts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  tagline text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text,
  currency text NOT NULL DEFAULT 'ETB',
  theme jsonb NOT NULL DEFAULT '{"primary":"#1f6f5c","accent":"#c58b32","background":"#fffdf7"}'::jsonb,
  products jsonb NOT NULL DEFAULT '[]'::jsonb,
  sections jsonb NOT NULL DEFAULT '["hero","about","contact","footer"]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Disputes and referrals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.disputes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id text REFERENCES public.transactions(id) ON DELETE CASCADE,
  raised_by text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  description text NOT NULL DEFAULT '',
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  resolution text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referrals (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referrer_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referral_code text UNIQUE NOT NULL,
  reward_amount numeric(14, 2) NOT NULL DEFAULT 0 CHECK (reward_amount >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.referral_signups (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  referral_id text NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  referred_user_id text NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reward_status text NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'earned', 'paid', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (referral_id, referred_user_id)
);

-- ============================================================
-- Updated-at triggers
-- ============================================================

DROP TRIGGER IF EXISTS trg_users_updated_at ON public.users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_gigs_updated_at ON public.gigs;
CREATE TRIGGER trg_gigs_updated_at BEFORE UPDATE ON public.gigs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_jobs_updated_at ON public.jobs;
CREATE TRIGGER trg_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_bids_updated_at ON public.bids;
CREATE TRIGGER trg_bids_updated_at BEFORE UPDATE ON public.bids FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_portfolio_items_updated_at ON public.portfolio_items;
CREATE TRIGGER trg_portfolio_items_updated_at BEFORE UPDATE ON public.portfolio_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_user_agents_updated_at ON public.user_agents;
CREATE TRIGGER trg_user_agents_updated_at BEFORE UPDATE ON public.user_agents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_agent_conversations_updated_at ON public.agent_conversations;
CREATE TRIGGER trg_agent_conversations_updated_at BEFORE UPDATE ON public.agent_conversations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_store_drafts_updated_at ON public.store_drafts;
CREATE TRIGGER trg_store_drafts_updated_at BEFORE UPDATE ON public.store_drafts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_disputes_updated_at ON public.disputes;
CREATE TRIGGER trg_disputes_updated_at BEFORE UPDATE ON public.disputes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Indexes for the application’s common queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_city ON public.users(city);
CREATE INDEX IF NOT EXISTS idx_gigs_freelancer ON public.gigs(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_gigs_category_active ON public.gigs(category, active);
CREATE INDEX IF NOT EXISTS idx_gigs_created_at ON public.gigs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_client ON public.jobs(client_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status_category ON public.jobs(status, category);
CREATE INDEX IF NOT EXISTS idx_jobs_created_at ON public.jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_job ON public.bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_freelancer ON public.bids(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client ON public.transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_freelancer ON public.transactions(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_orders_client ON public.orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_freelancer ON public.orders(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON public.messages(receiver_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON public.messages(sender_id, receiver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_saved_gigs_user ON public.saved_gigs(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON public.portfolio_items(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_user_active ON public.user_agents(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON public.agent_conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON public.agent_messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_store_drafts_user_status ON public.store_drafts(user_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON public.referrals(referral_code);

-- ============================================================
-- Basic Supabase RLS policies
-- ============================================================
-- The current Python backend should use the server-only Supabase secret key,
-- which bypasses RLS. These policies protect direct client access if the
-- publishable key is ever used from a Supabase client.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS categories_public_read ON public.categories;
CREATE POLICY categories_public_read ON public.categories FOR SELECT USING (active = 1);

DROP POLICY IF EXISTS gigs_public_read ON public.gigs;
CREATE POLICY gigs_public_read ON public.gigs FOR SELECT USING (active = 1);

DROP POLICY IF EXISTS jobs_public_read ON public.jobs;
CREATE POLICY jobs_public_read ON public.jobs FOR SELECT USING (status = 'open');

DROP POLICY IF EXISTS users_self_read ON public.users;
CREATE POLICY users_self_read ON public.users FOR SELECT USING (id = auth.uid()::text);

DROP POLICY IF EXISTS gigs_owner_write ON public.gigs;
CREATE POLICY gigs_owner_write ON public.gigs FOR ALL USING (freelancer_id = auth.uid()::text) WITH CHECK (freelancer_id = auth.uid()::text);

DROP POLICY IF EXISTS jobs_owner_write ON public.jobs;
CREATE POLICY jobs_owner_write ON public.jobs FOR ALL USING (client_id = auth.uid()::text) WITH CHECK (client_id = auth.uid()::text);

DROP POLICY IF EXISTS bids_owner_access ON public.bids;
CREATE POLICY bids_owner_access ON public.bids FOR ALL USING (freelancer_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bids.job_id AND j.client_id = auth.uid()::text)) WITH CHECK (freelancer_id = auth.uid()::text OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bids.job_id AND j.client_id = auth.uid()::text));

DROP POLICY IF EXISTS messages_participant_access ON public.messages;
CREATE POLICY messages_participant_access ON public.messages FOR ALL USING (sender_id = auth.uid()::text OR receiver_id = auth.uid()::text) WITH CHECK (sender_id = auth.uid()::text);

DROP POLICY IF EXISTS saved_gigs_owner_access ON public.saved_gigs;
CREATE POLICY saved_gigs_owner_access ON public.saved_gigs FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

DROP POLICY IF EXISTS store_drafts_owner_access ON public.store_drafts;
CREATE POLICY store_drafts_owner_access ON public.store_drafts FOR ALL USING (user_id = auth.uid()::text) WITH CHECK (user_id = auth.uid()::text);

-- Optional starter categories. Remove this block if categories already exist.
INSERT INTO public.categories (name, slug, icon, description, sort_order)
VALUES
  ('Graphic Design', 'graphic-design', '🎨', 'Branding, logos, social graphics, and visual design.', 10),
  ('Web Development', 'web-development', '💻', 'Websites, apps, ecommerce, and technical services.', 20),
  ('Writing & Translation', 'writing-translation', '✍️', 'Copywriting, editing, localization, and translation.', 30),
  ('Video & Animation', 'video-animation', '🎬', 'Video editing, motion graphics, and animation.', 40),
  ('Digital Marketing', 'digital-marketing', '📣', 'Social media, SEO, advertising, and growth services.', 50),
  ('Business', 'business', '📊', 'Consulting, research, virtual assistance, and operations.', 60)
ON CONFLICT (slug) DO NOTHING;

-- End of Otr Gebeya Supabase schema.
