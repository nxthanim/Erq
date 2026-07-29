const db = require('../config/db');

function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gigs (
      id TEXT PRIMARY KEY,
      freelancer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('Translation', 'Graphic Design', 'Video Editing', 'Web Development', 'Virtual Assistant', 'Social Media Management')),
      delivery_time INTEGER NOT NULL,
      portfolio_images TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      budget_min REAL NOT NULL,
      budget_max REAL NOT NULL,
      category TEXT NOT NULL,
      deadline DATETIME,
      status TEXT DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'delivered', 'completed', 'cancelled')),
      awarded_to TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (awarded_to) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS bids (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      proposal TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sender_id TEXT NOT NULL,
      receiver_id TEXT NOT NULL,
      job_id TEXT,
      message TEXT NOT NULL,
      attachment_url TEXT,
      attachment_name TEXT,
      attachment_size INTEGER,
      attachment_type TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      job_id TEXT,
      client_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'escrow' CHECK(status IN ('escrow', 'confirmed', 'released', 'refunded', 'disputed')),
      telebirr_reference TEXT,
      confirmation_selfie TEXT,
      confirmation_audio TEXT,
      confirmed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      reviewee_id TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      role TEXT NOT NULL CHECK(role IN ('client', 'freelancer')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewee_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'info',
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Create indexes for performance
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

    CREATE TABLE IF NOT EXISTS saved_gigs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      gig_id TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE,
      UNIQUE(user_id, gig_id)
    );

    -- Email Verification
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
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
      verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
    CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id);

    CREATE TABLE IF NOT EXISTS skill_badges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      skill TEXT NOT NULL,
      badge_type TEXT NOT NULL CHECK(badge_type IN ('verified', 'pro', 'top_rated', 'rising_talent')),
      issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_saved_gigs_user ON saved_gigs(user_id);
    CREATE INDEX IF NOT EXISTS idx_skill_badges_user ON skill_badges(user_id);

    -- Gig View Counter
    CREATE TABLE IF NOT EXISTS gig_views (
      id TEXT PRIMARY KEY,
      gig_id TEXT NOT NULL,
      viewer_ip TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE
    );

    -- Dispute Resolution (extended from transactions.disputed status)
    CREATE TABLE IF NOT EXISTS disputes (
      id TEXT PRIMARY KEY,
      transaction_id TEXT NOT NULL,
      raised_by TEXT NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      evidence TEXT DEFAULT '[]',
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'under_review', 'resolved_client', 'resolved_freelancer', 'resolved_split')),
      admin_notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (raised_by) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Referral System
    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_id TEXT NOT NULL,
      referral_code TEXT UNIQUE NOT NULL,
      total_signups INTEGER DEFAULT 0,
      total_earned REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS referral_signups (
      id TEXT PRIMARY KEY,
      referral_id TEXT NOT NULL,
      referred_user_id TEXT NOT NULL,
      bonus_given INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (referral_id) REFERENCES referrals(id) ON DELETE CASCADE,
      FOREIGN KEY (referred_user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Portfolio Gallery Items
    CREATE TABLE IF NOT EXISTS portfolio_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT NOT NULL,
      tags TEXT DEFAULT '[]',
      category TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Additional indexes
    CREATE INDEX IF NOT EXISTS idx_gig_views_gig ON gig_views(gig_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
    CREATE INDEX IF NOT EXISTS idx_referral_signups_referral ON referral_signups(referral_id);
    CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id);

    -- Password Reset Tokens
    -- Add order_id column to transactions if not exists (for linking gig orders to transactions)
    ALTER TABLE transactions ADD COLUMN order_id TEXT REFERENCES orders(id) ON DELETE SET NULL;

    -- Make job_id nullable in transactions (gig orders don't reference a job)
    -- Use safe PL/pgSQL block to avoid crash if already nullable on subsequent restarts
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='transactions' AND column_name='job_id' AND is_nullable='NO'
      ) THEN
        ALTER TABLE transactions ALTER COLUMN job_id DROP NOT NULL;
      END IF;
    END $$;

    -- Orders for gig purchases (full escrow flow)
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      gig_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      requirements TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'pending_payment', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed')),
      transaction_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (gig_id) REFERENCES gigs(id) ON DELETE CASCADE,
      FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id);
    CREATE INDEX IF NOT EXISTS idx_orders_freelancer ON orders(freelancer_id);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

    -- Order Deliveries (freelancer uploads files when delivering)
    CREATE TABLE IF NOT EXISTS order_deliveries (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      message TEXT,
      files TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON order_deliveries(order_id);

    -- Job Deliveries (freelancer uploads files when delivering for custom job postings)
    CREATE TABLE IF NOT EXISTS job_deliveries (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL,
      freelancer_id TEXT NOT NULL,
      message TEXT,
      files TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
      FOREIGN KEY (freelancer_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_job_deliveries_job ON job_deliveries(job_id);

    -- Allow 'pending_payment' status for Chapa payment flow
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'pending_payment', 'accepted', 'in_progress', 'delivered', 'completed', 'cancelled', 'disputed'));

    CREATE TABLE IF NOT EXISTS payment_receipts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('gig', 'job')),
      item_id TEXT NOT NULL,
      amount REAL NOT NULL,
      receipt_photo TEXT NOT NULL,
      receipt_reference TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'verified', 'suspicious', 'rejected')),
      risk_score REAL DEFAULT 0,
      risk_factors TEXT DEFAULT '[]',
      admin_notified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      verified_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- Login audit trail for security (IP logging)
    CREATE TABLE IF NOT EXISTS login_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      email TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      action TEXT NOT NULL CHECK(action IN ('login', 'signup', 'logout', 'failed_login')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_audit_email ON login_audit(email);
    CREATE INDEX IF NOT EXISTS idx_login_audit_created ON login_audit(created_at);

    -- Payment audit trail for security
    CREATE TABLE IF NOT EXISTS payment_audit (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      transaction_id TEXT,
      action TEXT NOT NULL CHECK(action IN ('biometric_attempt', 'biometric_success', 'receipt_verification', 'payment_release', 'payment_dispute')),
      ip_address TEXT,
      user_agent TEXT,
      details TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON payment_audit(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_audit_txn ON payment_audit(transaction_id);

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token);
    CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email);

    -- Service Categories (admin-managed)
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '📋',
      description TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active);

    -- Business Dashboard Tables
    CREATE TABLE IF NOT EXISTS business_customers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      notes TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'lead')),
      total_spent REAL DEFAULT 0,
      projects_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_meetings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_id TEXT,
      title TEXT NOT NULL,
      description TEXT,
      date DATETIME NOT NULL,
      duration INTEGER DEFAULT 30,
      status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'completed', 'cancelled')),
      meeting_type TEXT DEFAULT 'video' CHECK(meeting_type IN ('video', 'phone', 'in_person')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES business_customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS business_invoices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      customer_id TEXT,
      invoice_number TEXT NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled')),
      due_date DATETIME,
      paid_date DATETIME,
      line_items TEXT DEFAULT '[]',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES business_customers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS business_team (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      member_name TEXT NOT NULL,
      member_email TEXT,
      role TEXT DEFAULT 'member',
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_business_customers_user ON business_customers(user_id);
    CREATE INDEX IF NOT EXISTS idx_business_meetings_user ON business_meetings(user_id);
    CREATE INDEX IF NOT EXISTS idx_business_invoices_user ON business_invoices(user_id);
    CREATE INDEX IF NOT EXISTS idx_business_team_user ON business_team(user_id);

    -- Add metadata column to transactions for send-money and other extended data
    ALTER TABLE transactions ADD COLUMN metadata TEXT DEFAULT '{}';

    -- Wallet PIN attempt tracking for server-side rate limiting
    CREATE TABLE IF NOT EXISTS wallet_pin_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      successful INTEGER DEFAULT 0,
      ip_address TEXT,
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_wallet_pin_attempts_user ON wallet_pin_attempts(user_id);
    CREATE INDEX IF NOT EXISTS idx_wallet_pin_attempts_created ON wallet_pin_attempts(created_at);

    -- User AI Agents & Subagents
    CREATE TABLE IF NOT EXISTS user_agents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'assistant',
      instructions TEXT DEFAULT '',
      model TEXT DEFAULT 'default',
      avatar TEXT,
      color TEXT DEFAULT '#16a34a',
      parent_agent_id TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_agent_id) REFERENCES user_agents(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS agent_conversations (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'New Conversation',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (agent_id) REFERENCES user_agents(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS agent_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'agent', 'system')),
      content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_agents_parent ON user_agents(parent_agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent ON agent_conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id);

    -- Insert default categories
    INSERT OR IGNORE INTO categories (id, name, icon, description, sort_order)
    VALUES
      ('cat-trans', 'Translation', '📝', 'Document, audio, and video translation services', 1),
      ('cat-design', 'Graphic Design', '🎨', 'Logo design, branding, illustrations', 2),
      ('cat-video', 'Video Editing', '🎬', 'Video production, editing, motion graphics', 3),
      ('cat-web', 'Web Development', '💻', 'Website and web application development', 4),
      ('cat-va', 'Virtual Assistant', '🤝', 'Administrative support and assistance', 5),
      ('cat-social', 'Social Media Management', '📱', 'Content creation and community management', 6),
      ('cat-ai', 'AI Services', '🤖', 'AI-powered solutions and automation', 7),
      ('cat-consulting', 'Consulting', '💼', 'Expert business and technical consulting', 8),
      ('cat-data', 'Data', '📊', 'Data analysis, visualization, and management', 9);
  `  );

  // Seed default admin user if none exists
  const adminExists = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get().count;
  if (!adminExists) {
    const bcrypt = require('bcryptjs');
    const adminId = 'admin-default';
    const adminPassword = bcrypt.hashSync('admin123', 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, full_name, role, verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(adminId, 'admin@gebeya.et', adminPassword, 'Admin User', 'admin', 1);
    console.log('   📋 Default admin created: admin@gebeya.et / admin123');
  }

  // Seed default system user for hardcoded default agents
  const systemUserExists = db.prepare("SELECT COUNT(*) as count FROM users WHERE id = 'system'").get().count;
  if (!systemUserExists) {
    const bcrypt = require('bcryptjs');
    const systemPassword = bcrypt.hashSync('system-default-2024', 10);
    db.prepare(`
      INSERT OR IGNORE INTO users (id, email, password, full_name, role, verified)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('system', 'system@gebeya.et', systemPassword, 'System', 'admin', 1);
    console.log('   📋 System user created for default agents');
  }

  // Seed default agents so foreign key constraints work when chatting with them
  const defaultAgents = [
    { id: 'agent-assistant', name: 'Erq Assistant', role: 'General Assistant', instructions: 'A helpful AI assistant for the Erq marketplace.', color: '#1a1a1a' },
    { id: 'agent-writer', name: 'Content Writer', role: 'Content Creator', instructions: 'Specialized in writing and translation services.', color: '#444444' },
    { id: 'agent-designer', name: 'Design Advisor', role: 'Design Consultant', instructions: 'Expert in graphic design, branding, and visual aesthetics.', color: '#666666' },
    { id: 'agent-analyst', name: 'Data Analyst', role: 'Analytics Expert', instructions: 'Analyzes marketplace data and user performance metrics.', color: '#888888' },
  ];

  for (const agent of defaultAgents) {
    const existing = db.prepare('SELECT COUNT(*) as count FROM user_agents WHERE id = ?').get(agent.id).count;
    if (!existing) {
      db.prepare(`
        INSERT OR IGNORE INTO user_agents (id, user_id, name, role, instructions, color, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
      `).run(agent.id, 'system', agent.name, agent.role, agent.instructions, agent.color);
    }
  }
  console.log('   📋 Default agents seeded for foreign key compliance');

  console.log('✅ Database schema initialized');
}

module.exports = { initializeDatabase };
