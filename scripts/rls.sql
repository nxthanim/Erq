-- ============================================================================
-- Row Level Security (RLS) — PostgreSQL only
--
-- The app connects as the table owner, so RLS would normally be bypassed.
-- `FORCE ROW LEVEL SECURITY` makes the owner subject to the policies too, and
-- the backend sets the per-request identity via:
--
--     SELECT set_config('app.current_user_id', '<user_id>', true)
--
-- (see python_backend/auth.py get_current_user). Anonymous requests leave the
-- setting empty, so `app.current_user_id()` is NULL and only explicitly public
-- data is visible.
--
-- Apply after the base schema exists:
--     psql "$DATABASE_URL" -f scripts/rls.sql
-- Idempotent — safe to re-run.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS app;

-- ---------------------------------------------------------------------------
-- Ensure tables referenced below exist (normally created by ensure_extra_columns
-- at app startup; creating here makes this script self-sufficient).
-- ---------------------------------------------------------------------------
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

CREATE TABLE IF NOT EXISTS ads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform TEXT DEFAULT 'facebook',
  title TEXT NOT NULL,
  description TEXT,
  target_url TEXT,
  target_audience TEXT,
  budget REAL DEFAULT 0,
  daily_budget REAL DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending','active','paused','completed','rejected')),
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.current_user_id() RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT NULLIF(current_setting('app.current_user_id', true), '')::text $$;

CREATE OR REPLACE FUNCTION app.is_admin() RETURNS boolean
LANGUAGE sql STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = app.current_user_id() AND u.role = 'admin'
  )
$$;

-- ---------------------------------------------------------------------------
-- MESSAGES — only the two participants (or an admin) see a conversation
-- ---------------------------------------------------------------------------
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS messages_select ON messages;
CREATE POLICY messages_select ON messages FOR SELECT
  USING (sender_id = app.current_user_id() OR receiver_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS messages_insert ON messages;
CREATE POLICY messages_insert ON messages FOR INSERT
  WITH CHECK (sender_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS messages_update ON messages;
CREATE POLICY messages_update ON messages FOR UPDATE
  USING (sender_id = app.current_user_id() OR receiver_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (sender_id = app.current_user_id() OR receiver_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS messages_delete ON messages;
CREATE POLICY messages_delete ON messages FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- TRANSACTIONS — the paying client, the receiving freelancer, or an admin
-- ---------------------------------------------------------------------------
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS transactions_select ON transactions;
CREATE POLICY transactions_select ON transactions FOR SELECT
  USING (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS transactions_insert ON transactions;
CREATE POLICY transactions_insert ON transactions FOR INSERT
  WITH CHECK (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS transactions_update ON transactions;
CREATE POLICY transactions_update ON transactions FOR UPDATE
  USING (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS transactions_delete ON transactions;
CREATE POLICY transactions_delete ON transactions FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- ORDERS — client, freelancer, or admin
-- ---------------------------------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS orders_select ON orders;
CREATE POLICY orders_select ON orders FOR SELECT
  USING (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS orders_insert ON orders;
CREATE POLICY orders_insert ON orders FOR INSERT
  WITH CHECK (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS orders_update ON orders;
CREATE POLICY orders_update ON orders FOR UPDATE
  USING (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (client_id = app.current_user_id() OR freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS orders_delete ON orders;
CREATE POLICY orders_delete ON orders FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — owner only for reads; server may insert for any user
-- ---------------------------------------------------------------------------
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications FOR INSERT
  WITH CHECK (true);  -- server-side cross-user notifications (e.g. "new bid")
DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS notifications_delete ON notifications;
CREATE POLICY notifications_delete ON notifications FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- SAVED GIGS
-- ---------------------------------------------------------------------------
ALTER TABLE saved_gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_gigs FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS saved_gigs_select ON saved_gigs;
CREATE POLICY saved_gigs_select ON saved_gigs FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS saved_gigs_insert ON saved_gigs;
CREATE POLICY saved_gigs_insert ON saved_gigs FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS saved_gigs_update ON saved_gigs;
CREATE POLICY saved_gigs_update ON saved_gigs FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS saved_gigs_delete ON saved_gigs;
CREATE POLICY saved_gigs_delete ON saved_gigs FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

-- ---------------------------------------------------------------------------
-- BIDS — the bidding freelancer, the job's client, or an admin
-- ---------------------------------------------------------------------------
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bids_select ON bids;
CREATE POLICY bids_select ON bids FOR SELECT
  USING (
    freelancer_id = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bids.job_id AND j.client_id = app.current_user_id())
  );
DROP POLICY IF EXISTS bids_insert ON bids;
CREATE POLICY bids_insert ON bids FOR INSERT
  WITH CHECK (freelancer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS bids_update ON bids;
CREATE POLICY bids_update ON bids FOR UPDATE
  USING (
    freelancer_id = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bids.job_id AND j.client_id = app.current_user_id())
  )
  WITH CHECK (
    freelancer_id = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = bids.job_id AND j.client_id = app.current_user_id())
  );
DROP POLICY IF EXISTS bids_delete ON bids;
CREATE POLICY bids_delete ON bids FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- DISPUTES — raiser, parties on the underlying transaction, or admin
-- ---------------------------------------------------------------------------
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS disputes_select ON disputes;
CREATE POLICY disputes_select ON disputes FOR SELECT
  USING (
    raised_by = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
        AND (t.client_id = app.current_user_id() OR t.freelancer_id = app.current_user_id())
    )
  );
DROP POLICY IF EXISTS disputes_insert ON disputes;
CREATE POLICY disputes_insert ON disputes FOR INSERT
  WITH CHECK (raised_by = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS disputes_update ON disputes;
CREATE POLICY disputes_update ON disputes FOR UPDATE
  USING (
    raised_by = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
        AND (t.client_id = app.current_user_id() OR t.freelancer_id = app.current_user_id())
    )
  )
  WITH CHECK (
    raised_by = app.current_user_id()
    OR app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE t.id = disputes.transaction_id
        AND (t.client_id = app.current_user_id() OR t.freelancer_id = app.current_user_id())
    )
  );
DROP POLICY IF EXISTS disputes_delete ON disputes;
CREATE POLICY disputes_delete ON disputes FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- WALLET PIN ATTEMPTS
-- ---------------------------------------------------------------------------
ALTER TABLE wallet_pin_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_pin_attempts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wallet_pin_attempts_select ON wallet_pin_attempts;
CREATE POLICY wallet_pin_attempts_select ON wallet_pin_attempts FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS wallet_pin_attempts_insert ON wallet_pin_attempts;
CREATE POLICY wallet_pin_attempts_insert ON wallet_pin_attempts FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS wallet_pin_attempts_update ON wallet_pin_attempts;
CREATE POLICY wallet_pin_attempts_update ON wallet_pin_attempts FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS wallet_pin_attempts_delete ON wallet_pin_attempts;
CREATE POLICY wallet_pin_attempts_delete ON wallet_pin_attempts FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- PAYMENT RECEIPTS
-- ---------------------------------------------------------------------------
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_receipts_select ON payment_receipts;
CREATE POLICY payment_receipts_select ON payment_receipts FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS payment_receipts_insert ON payment_receipts;
CREATE POLICY payment_receipts_insert ON payment_receipts FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS payment_receipts_update ON payment_receipts;
CREATE POLICY payment_receipts_update ON payment_receipts FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS payment_receipts_delete ON payment_receipts;
CREATE POLICY payment_receipts_delete ON payment_receipts FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- LOGIN AUDIT — anyone may write; only admins may read
-- ---------------------------------------------------------------------------
ALTER TABLE login_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_audit FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS login_audit_select ON login_audit;
CREATE POLICY login_audit_select ON login_audit FOR SELECT
  USING (app.is_admin());
DROP POLICY IF EXISTS login_audit_insert ON login_audit;
CREATE POLICY login_audit_insert ON login_audit FOR INSERT
  WITH CHECK (true);  -- failed logins are recorded before any identity exists
DROP POLICY IF EXISTS login_audit_update ON login_audit;
CREATE POLICY login_audit_update ON login_audit FOR UPDATE
  USING (app.is_admin())
  WITH CHECK (app.is_admin());
DROP POLICY IF EXISTS login_audit_delete ON login_audit;
CREATE POLICY login_audit_delete ON login_audit FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- BUSINESS DASHBOARD (CRM) — per-user
-- ---------------------------------------------------------------------------
ALTER TABLE business_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_customers FORCE ROW LEVEL SECURITY;
ALTER TABLE business_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_meetings FORCE ROW LEVEL SECURITY;
ALTER TABLE business_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_invoices FORCE ROW LEVEL SECURITY;
ALTER TABLE business_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_team FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS business_customers_select ON business_customers;
CREATE POLICY business_customers_select ON business_customers FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_customers_insert ON business_customers;
CREATE POLICY business_customers_insert ON business_customers FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_customers_update ON business_customers;
CREATE POLICY business_customers_update ON business_customers FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_customers_delete ON business_customers;
CREATE POLICY business_customers_delete ON business_customers FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

DROP POLICY IF EXISTS business_meetings_select ON business_meetings;
CREATE POLICY business_meetings_select ON business_meetings FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_meetings_insert ON business_meetings;
CREATE POLICY business_meetings_insert ON business_meetings FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_meetings_update ON business_meetings;
CREATE POLICY business_meetings_update ON business_meetings FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_meetings_delete ON business_meetings;
CREATE POLICY business_meetings_delete ON business_meetings FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

DROP POLICY IF EXISTS business_invoices_select ON business_invoices;
CREATE POLICY business_invoices_select ON business_invoices FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_invoices_insert ON business_invoices;
CREATE POLICY business_invoices_insert ON business_invoices FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_invoices_update ON business_invoices;
CREATE POLICY business_invoices_update ON business_invoices FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_invoices_delete ON business_invoices;
CREATE POLICY business_invoices_delete ON business_invoices FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

DROP POLICY IF EXISTS business_team_select ON business_team;
CREATE POLICY business_team_select ON business_team FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_team_insert ON business_team;
CREATE POLICY business_team_insert ON business_team FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_team_update ON business_team;
CREATE POLICY business_team_update ON business_team FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS business_team_delete ON business_team;
CREATE POLICY business_team_delete ON business_team FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

-- ---------------------------------------------------------------------------
-- AI AGENTS — owner (or the shared 'system' defaults) or admin
-- ---------------------------------------------------------------------------
ALTER TABLE user_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_agents FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_agents_select ON user_agents;
CREATE POLICY user_agents_select ON user_agents FOR SELECT
  USING (user_id = app.current_user_id() OR user_id = 'system' OR app.is_admin());
DROP POLICY IF EXISTS user_agents_insert ON user_agents;
CREATE POLICY user_agents_insert ON user_agents FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR user_id = 'system' OR app.is_admin());
DROP POLICY IF EXISTS user_agents_update ON user_agents;
CREATE POLICY user_agents_update ON user_agents FOR UPDATE
  USING (user_id = app.current_user_id() OR user_id = 'system' OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR user_id = 'system' OR app.is_admin());
DROP POLICY IF EXISTS user_agents_delete ON user_agents;
CREATE POLICY user_agents_delete ON user_agents FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_conversations FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_conversations_select ON agent_conversations;
CREATE POLICY agent_conversations_select ON agent_conversations FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS agent_conversations_insert ON agent_conversations;
CREATE POLICY agent_conversations_insert ON agent_conversations FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS agent_conversations_update ON agent_conversations;
CREATE POLICY agent_conversations_update ON agent_conversations FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS agent_conversations_delete ON agent_conversations;
CREATE POLICY agent_conversations_delete ON agent_conversations FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

ALTER TABLE agent_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS agent_messages_select ON agent_messages;
CREATE POLICY agent_messages_select ON agent_messages FOR SELECT
  USING (
    app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = app.current_user_id()
    )
  );
DROP POLICY IF EXISTS agent_messages_insert ON agent_messages;
CREATE POLICY agent_messages_insert ON agent_messages FOR INSERT
  WITH CHECK (
    app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = app.current_user_id()
    )
  );
DROP POLICY IF EXISTS agent_messages_update ON agent_messages;
CREATE POLICY agent_messages_update ON agent_messages FOR UPDATE
  USING (
    app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = app.current_user_id()
    )
  )
  WITH CHECK (
    app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.agent_conversations c
      WHERE c.id = agent_messages.conversation_id AND c.user_id = app.current_user_id()
    )
  );
DROP POLICY IF EXISTS agent_messages_delete ON agent_messages;
CREATE POLICY agent_messages_delete ON agent_messages FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- REFERRAL SIGNUPS — visible to the referrer (or admin)
-- ---------------------------------------------------------------------------
ALTER TABLE referral_signups ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_signups FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referral_signups_select ON referral_signups;
CREATE POLICY referral_signups_select ON referral_signups FOR SELECT
  USING (
    app.is_admin()
    OR EXISTS (
      SELECT 1 FROM public.referrals r
      WHERE r.id = referral_signups.referral_id AND r.referrer_id = app.current_user_id()
    )
  );
DROP POLICY IF EXISTS referral_signups_insert ON referral_signups;
CREATE POLICY referral_signups_insert ON referral_signups FOR INSERT
  WITH CHECK (true);  -- signups are recorded by the backend on the referred account
DROP POLICY IF EXISTS referral_signups_update ON referral_signups;
CREATE POLICY referral_signups_update ON referral_signups FOR UPDATE
  USING (app.is_admin())
  WITH CHECK (app.is_admin());
DROP POLICY IF EXISTS referral_signups_delete ON referral_signups;
CREATE POLICY referral_signups_delete ON referral_signups FOR DELETE
  USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- ADS — owner or admin
-- ---------------------------------------------------------------------------
ALTER TABLE ads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ads_select ON ads;
CREATE POLICY ads_select ON ads FOR SELECT
  USING (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS ads_insert ON ads;
CREATE POLICY ads_insert ON ads FOR INSERT
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS ads_update ON ads;
CREATE POLICY ads_update ON ads FOR UPDATE
  USING (user_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (user_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS ads_delete ON ads;
CREATE POLICY ads_delete ON ads FOR DELETE
  USING (user_id = app.current_user_id() OR app.is_admin());

-- ---------------------------------------------------------------------------
-- TIPS — public read (creator profile), but only the sender may insert
-- ---------------------------------------------------------------------------
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tips_select ON tips;
CREATE POLICY tips_select ON tips FOR SELECT USING (true);
DROP POLICY IF EXISTS tips_insert ON tips;
CREATE POLICY tips_insert ON tips FOR INSERT
  WITH CHECK (sender_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS tips_update ON tips;
CREATE POLICY tips_update ON tips FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());
DROP POLICY IF EXISTS tips_delete ON tips;
CREATE POLICY tips_delete ON tips FOR DELETE USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- REFERRALS — public read (by code), owner/admin may write
-- ---------------------------------------------------------------------------
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS referrals_select ON referrals;
CREATE POLICY referrals_select ON referrals FOR SELECT USING (true);
DROP POLICY IF EXISTS referrals_insert ON referrals;
CREATE POLICY referrals_insert ON referrals FOR INSERT
  WITH CHECK (referrer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS referrals_update ON referrals;
CREATE POLICY referrals_update ON referrals FOR UPDATE
  USING (referrer_id = app.current_user_id() OR app.is_admin())
  WITH CHECK (referrer_id = app.current_user_id() OR app.is_admin());
DROP POLICY IF EXISTS referrals_delete ON referrals;
CREATE POLICY referrals_delete ON referrals FOR DELETE USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- PAYMENT AUDIT — server writes; only admins may read
-- ---------------------------------------------------------------------------
ALTER TABLE payment_audit ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payment_audit_select ON payment_audit;
CREATE POLICY payment_audit_select ON payment_audit FOR SELECT USING (app.is_admin());
DROP POLICY IF EXISTS payment_audit_insert ON payment_audit;
CREATE POLICY payment_audit_insert ON payment_audit FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS payment_audit_update ON payment_audit;
CREATE POLICY payment_audit_update ON payment_audit FOR UPDATE
  USING (app.is_admin()) WITH CHECK (app.is_admin());
DROP POLICY IF EXISTS payment_audit_delete ON payment_audit;
CREATE POLICY payment_audit_delete ON payment_audit FOR DELETE USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- PASSWORD RESETS — token rows are secret; only the server flow may touch them
-- ---------------------------------------------------------------------------
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS password_resets_select ON password_resets;
CREATE POLICY password_resets_select ON password_resets FOR SELECT USING (app.is_admin());
DROP POLICY IF EXISTS password_resets_insert ON password_resets;
CREATE POLICY password_resets_insert ON password_resets FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS password_resets_update ON password_resets;
CREATE POLICY password_resets_update ON password_resets FOR UPDATE WITH CHECK (true);
DROP POLICY IF EXISTS password_resets_delete ON password_resets;
CREATE POLICY password_resets_delete ON password_resets FOR DELETE USING (app.is_admin());

-- ---------------------------------------------------------------------------
-- Note on tables intentionally NOT covered by RLS:
--   users, gigs, jobs, categories, reviews, portfolio_items, gig_views,
--   skill_badges, email_verifications, order_deliveries, job_deliveries
-- These are either public-facing (marketplace, profiles, reviews, portfolios)
-- or relied on by anonymous flows (email verification). User privacy on the
-- users table is enforced in the API layer (emails/phones are stripped from
-- public responses — see python_backend/routers/users.py).
-- ============================================================================
