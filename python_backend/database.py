"""Async SQLAlchemy database configuration with asyncpg.

Supports PostgreSQL (production / Vercel) and SQLite (local dev fallback).
All time/interval/search SQL should go through the portable helpers at the
bottom of this module so the same queries run on both dialects.
"""

import os
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg
import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from python_backend.config import settings


def _build_async_url() -> str:
    """Convert a sync Postgres URL to async (asyncpg)."""
    url = settings.DATABASE_URL
    if not url:
        return "sqlite+aiosqlite:///./erq_dev.db"

    # If it's already async, return as-is
    if url.startswith("postgresql+asyncpg://") or url.startswith("sqlite+aiosqlite://"):
        return url

    # Convert postgres:// -> postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif url.startswith("sqlite://"):
        url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)

    # Supabase's transaction pooler adds pgbouncer=true for Prisma/Drizzle.
    # asyncpg does not accept that query parameter as a connection keyword;
    # remove it while preserving every other URL parameter.
    try:
        parts = urlsplit(url)
        query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key.lower() != "pgbouncer"]
        url = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    except ValueError:
        pass

    return url


ASYNC_DATABASE_URL = _build_async_url()

# SQLite aiosqlite doesn't support pool_size/max_overflow
_is_sqlite = ASYNC_DATABASE_URL.startswith("sqlite")

engine_kwargs = {"echo": False, "pool_pre_ping": True}
if not _is_sqlite:
    engine_kwargs["pool_size"] = 5
    engine_kwargs["max_overflow"] = 10
    # Supabase transaction-mode poolers do not support asyncpg prepared
    # statements across reused connections.
    raw_database_url = settings.DATABASE_URL or ""
    if ":6543/" in raw_database_url or "pgbouncer=true" in raw_database_url.lower():
        engine_kwargs["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(ASYNC_DATABASE_URL, **engine_kwargs)

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


# ==========================================================================
# Portable SQL helpers (PostgreSQL ⇄ SQLite)
# ==========================================================================

def now_sql() -> str:
    """Current-timestamp expression that works on both dialects."""
    return "CURRENT_TIMESTAMP" if _is_sqlite else "NOW()"


def interval_sql(seconds: int) -> str:
    """`<now> - N seconds` expression that works on both dialects."""
    if _is_sqlite:
        return f"datetime('now', '-{int(seconds)} seconds')"
    return f"NOW() - INTERVAL '{int(seconds)} seconds'"


def range_interval_sql(column: str, param: str) -> str:
    """`column > <now> - <bound_param>` where the param is like '7 days'.

    PostgreSQL uses `:param::interval`; SQLite concatenates a modifier.
    """
    if _is_sqlite:
        return f"{column} > datetime('now', '-' || :{param})"
    return f"{column} > NOW() - :{param}::interval"


def interval_plus_sql(seconds: int) -> str:
    """`<now> + N seconds` expression that works on both dialects."""
    if _is_sqlite:
        return f"datetime('now', '+{int(seconds)} seconds')"
    return f"NOW() + INTERVAL '{int(seconds)} seconds'"


def date_trunc_sql(unit: str, column: str) -> str:
    """Date-truncation expression ('day' | 'month') for both dialects."""
    if _is_sqlite:
        if unit == "month":
            return f"strftime('%Y-%m-01', {column})"
        return f"date({column})"
    return f"DATE_TRUNC('{unit}', {column})"


def ilike_sql() -> str:
    """Case-insensitive LIKE operator for both dialects."""
    return "LIKE" if _is_sqlite else "ILIKE"


async def get_db() -> AsyncSession:
    """FastAPI dependency yielding an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def set_rls_user(db: AsyncSession, user_id: str):
    """Set the Row-Level-Security context for the current request's transaction.

    PostgreSQL only (SQLite has no RLS). Uses set_config with is_local=true so
    the value applies just to this request's transaction, which is how the RLS
    policies in scripts/rls.sql decide which rows are visible (e.g. "my" rows).
    """
    if _is_sqlite:
        return
    try:
        await db.execute(
            text("SELECT set_config('app.current_user_id', :uid, true)"),
            {"uid": user_id or ""},
        )
    except Exception as exc:
        # Failure means RLS stays empty → request silently sees no rows.
        print(f"[rls] could not set user context: {exc}")


async def init_db():
    """Create all tables idempotently; demo data is opt-in."""
    # Import models so every ORM table is registered on Base.metadata.
    # Without this, create_all has an empty metadata and creates nothing.
    import python_backend.models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    if settings.SEED_DEFAULT_DATA:
        await _seed_defaults()


async def _seed_defaults():
    """Idempotent seed data — mirrors scripts/migration.sql.

    Seeds default categories, the admin/system users (FK targets), and the
    default AI agents owned by the system user. Safe to run on any startup.
    """
    async with AsyncSessionLocal() as db:
        # ---- Categories ----
        count = await db.execute(text("SELECT COUNT(*) as c FROM categories"))
        if count.mappings().first()["c"] == 0:
            categories = [
                ("cat-trans", "Translation", "📝", "Document, audio, and video translation services", 1),
                ("cat-design", "Graphic Design", "🎨", "Logo design, branding, illustrations", 2),
                ("cat-video", "Video Editing", "🎬", "Video production, editing, motion graphics", 3),
                ("cat-web", "Web Development", "💻", "Website and web application development", 4),
                ("cat-va", "Virtual Assistant", "🤝", "Administrative support and assistance", 5),
                ("cat-social", "Social Media Management", "📱", "Content creation and community management", 6),
                ("cat-ai", "AI Services", "🤖", "AI-powered solutions and automation", 7),
                ("cat-consulting", "Consulting", "💼", "Expert business and technical consulting", 8),
                ("cat-data", "Data", "📊", "Data analysis, visualization, and management", 9),
            ]
            for cid, name, icon, desc, sort_order in categories:
                await db.execute(
                    text(
                        "INSERT INTO categories (id, name, icon, description, sort_order) "
                        "VALUES (:id, :name, :icon, :desc, :sort)"
                    ),
                    {"id": cid, "name": name, "icon": icon, "desc": desc, "sort": sort_order},
                )

        # ---- Admin + system users (FK targets for default agents / wallet txns) ----
        for uid, email, full_name, role in (
            ("admin-default", "admin@gebeya.et", "Admin User", "admin"),
            ("system", "system@gebeya.et", "System", "admin"),
        ):
            exists = await db.execute(text("SELECT id FROM users WHERE id = :id"), {"id": uid})
            if not exists.mappings().first():
                # Only compute the (slow) bcrypt hash when we actually seed the admin
                password = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode() if role == "admin" else ""
                await db.execute(
                    text(
                        "INSERT INTO users (id, email, password, full_name, role, verified) "
                        "VALUES (:id, :email, :pwd, :name, :role, 1)"
                    ),
                    {"id": uid, "email": email, "pwd": password, "name": full_name, "role": role},
                )

        # ---- Default AI agents (owned by system user) ----
        agent_count = await db.execute(text("SELECT COUNT(*) as c FROM user_agents"))
        if agent_count.mappings().first()["c"] == 0:
            agents = [
                ("agent-assistant", "Erq Assistant", "General Assistant", "A helpful AI assistant for the Erq marketplace.", "#1a1a1a"),
                ("agent-writer", "Content Writer", "Content Creator", "Specialized in writing and translation services.", "#444444"),
                ("agent-designer", "Design Advisor", "Design Consultant", "Expert in graphic design, branding, and visual aesthetics.", "#666666"),
                ("agent-analyst", "Data Analyst", "Analytics Expert", "Analyzes marketplace data and user performance metrics.", "#888888"),
            ]
            for aid, name, role, instructions, color in agents:
                await db.execute(
                    text(
                        "INSERT INTO user_agents (id, user_id, name, role, instructions, color, is_active) "
                        "VALUES (:id, 'system', :name, :role, :inst, :color, 1)"
                    ),
                    {"id": aid, "name": name, "role": role, "inst": instructions, "color": color},
                )

        await db.commit()


_RATE_LIMIT_DDL = """
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  endpoint TEXT,
  method TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_BANNED_IPS_DDL = """
CREATE TABLE IF NOT EXISTS banned_ips (
  id TEXT PRIMARY KEY,
  ip TEXT NOT NULL,
  reason TEXT,
  banned_until TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_TIPS_DDL = """
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount REAL NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)
"""

_ADS_DDL = """
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
)
"""


async def _ensure_extra_columns_postgres():
    """PostgreSQL path — ADD COLUMN IF NOT EXISTS is supported there."""
    extra_columns = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
        _TIPS_DDL,
        _ADS_DDL,
        _RATE_LIMIT_DDL,
        _BANNED_IPS_DDL,
        "CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id)",
        "CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id)",
        "CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_hits(ip, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip)",
    ]
    for stmt in extra_columns:
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception as exc:
            print(f"[skip] schema migration ({stmt[:60]}...): {exc}")


async def _ensure_extra_columns_sqlite():
    """SQLite path — ADD COLUMN IF NOT EXISTS is NOT supported, so check PRAGMA first."""
    # Add missing users columns (checked via PRAGMA table_info)
    async with engine.connect() as conn:
        rows = (await conn.execute(text("PRAGMA table_info(users)"))).fetchall()
        existing = {str(r[1]) for r in rows}
    async with engine.begin() as conn:
        if "clerk_id" not in existing:
            await conn.execute(text("ALTER TABLE users ADD COLUMN clerk_id TEXT"))
        if "last_active_at" not in existing:
            await conn.execute(
                text("ALTER TABLE users ADD COLUMN last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP")
            )
    # Tips / ads / rate-limit tables + their indexes (IF NOT EXISTS is supported on SQLite for CREATE INDEX)
    for stmt in (
        _TIPS_DDL,
        _ADS_DDL,
        _RATE_LIMIT_DDL,
        _BANNED_IPS_DDL,
        "CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id)",
        "CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id)",
        "CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_hits(ip, created_at)",
        "CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip)",
    ):
        try:
            async with engine.begin() as conn:
                await conn.execute(text(stmt))
        except Exception as exc:
            print(f"[skip] schema migration ({stmt[:60]}...): {exc}")


# ==========================================================================
# Scale indexes — keep in one shared list so PostgreSQL and SQLite apply the
# exact same DDL idempotently (CREATE INDEX IF NOT EXISTS works on both).
# The ORM models define the same indexes for brand-new databases; this list
# upgrades EXISTING databases, which create_all() never touches.
# ==========================================================================

_SCALE_INDEX_DDL = [
    # Users
    "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
    "CREATE INDEX IF NOT EXISTS idx_users_rating ON users(rating DESC, review_count DESC)",
    "CREATE INDEX IF NOT EXISTS idx_users_clerk ON users(clerk_id)",
    # Gigs
    "CREATE INDEX IF NOT EXISTS idx_gigs_freelancer ON gigs(freelancer_id)",
    "CREATE INDEX IF NOT EXISTS idx_gigs_category ON gigs(category)",
    "CREATE INDEX IF NOT EXISTS idx_gigs_active_category ON gigs(active, category)",
    "CREATE INDEX IF NOT EXISTS idx_gigs_freelancer_active ON gigs(freelancer_id, active)",
    "CREATE INDEX IF NOT EXISTS idx_gigs_created ON gigs(created_at)",
    # Jobs
    "CREATE INDEX IF NOT EXISTS idx_jobs_client ON jobs(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_client_status ON jobs(client_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_awarded ON jobs(awarded_to)",
    "CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at)",
    # Bids
    "CREATE INDEX IF NOT EXISTS idx_bids_job ON bids(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_bids_job_status ON bids(job_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_bids_freelancer ON bids(freelancer_id)",
    # Messages
    "CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id)",
    "CREATE INDEX IF NOT EXISTS idx_messages_receiver_read ON messages(receiver_id, read)",
    "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)",
    # Transactions
    "CREATE INDEX IF NOT EXISTS idx_transactions_job ON transactions(job_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_freelancer ON transactions(freelancer_id)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_freelancer_status ON transactions(freelancer_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_client_status ON transactions(client_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_status_created ON transactions(status, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at)",
    # Reviews
    "CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_created ON reviews(reviewee_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id)",
    "CREATE INDEX IF NOT EXISTS idx_reviews_job ON reviews(job_id)",
    # Notifications
    "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read)",
    "CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at)",
    # Orders
    "CREATE INDEX IF NOT EXISTS idx_orders_client ON orders(client_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_freelancer ON orders(freelancer_id)",
    "CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_client_status ON orders(client_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_freelancer_status ON orders(freelancer_id, status)",
    "CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_orders_transaction ON orders(transaction_id)",
    # Saved gigs / views / badges / portfolio
    "CREATE INDEX IF NOT EXISTS idx_saved_gigs_user ON saved_gigs(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_saved_gigs_gig ON saved_gigs(gig_id)",
    "CREATE INDEX IF NOT EXISTS idx_gig_views_gig ON gig_views(gig_id)",
    "CREATE INDEX IF NOT EXISTS idx_gig_views_gig_created ON gig_views(gig_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_skill_badges_user ON skill_badges(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_skill_badges_user_badge ON skill_badges(user_id, badge_type)",
    "CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_portfolio_user_created ON portfolio_items(user_id, created_at)",
    # Disputes / referrals
    "CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id)",
    "CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status)",
    "CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id)",
    "CREATE INDEX IF NOT EXISTS idx_referral_signups_referral ON referral_signups(referral_id)",
    # Deliveries
    "CREATE INDEX IF NOT EXISTS idx_order_deliveries_order ON order_deliveries(order_id)",
    "CREATE INDEX IF NOT EXISTS idx_job_deliveries_job ON job_deliveries(job_id)",
    # Payment receipts / audits / resets
    "CREATE INDEX IF NOT EXISTS idx_payment_receipts_user ON payment_receipts(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_payment_receipts_reference ON payment_receipts(receipt_reference)",
    "CREATE INDEX IF NOT EXISTS idx_login_audit_user ON login_audit(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_login_audit_email ON login_audit(email)",
    "CREATE INDEX IF NOT EXISTS idx_payment_audit_user ON payment_audit(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_payment_audit_txn ON payment_audit(transaction_id)",
    "CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token)",
    "CREATE INDEX IF NOT EXISTS idx_password_resets_email ON password_resets(email)",
    # Categories / business CRM / agents
    "CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(active)",
    "CREATE INDEX IF NOT EXISTS idx_business_customers_user ON business_customers(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_business_meetings_user ON business_meetings(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_business_invoices_user ON business_invoices(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_business_team_user ON business_team(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_user_agents_user ON user_agents(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_user_agents_parent ON user_agents(parent_agent_id)",
    "CREATE INDEX IF NOT EXISTS idx_agent_conversations_agent ON agent_conversations(agent_id)",
    "CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation ON agent_messages(conversation_id)",
    "CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email)",
    "CREATE INDEX IF NOT EXISTS idx_email_verifications_user ON email_verifications(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_tips_receiver ON tips(receiver_id)",
    "CREATE INDEX IF NOT EXISTS idx_tips_sender ON tips(sender_id)",
    "CREATE INDEX IF NOT EXISTS idx_ads_user ON ads(user_id)",
    "CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_time ON rate_limit_hits(ip, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_banned_ips_ip ON banned_ips(ip)",
]


async def ensure_extra_columns():
    """Idempotently add columns/tables that aren't in the original schema (safe to re-run)."""
    if _is_sqlite:
        await _ensure_extra_columns_sqlite()
    else:
        await _ensure_extra_columns_postgres()
    # Apply the shared scale indexes on both dialects (idempotent).
    async with engine.begin() as conn:
        for stmt in _SCALE_INDEX_DDL:
            try:
                await conn.execute(text(stmt))
            except Exception as exc:
                print(f"[skip] index ({stmt[:60]}...): {exc}")


async def apply_rls():
    """Apply Row-Level-Security policies (scripts/rls.sql) on PostgreSQL.

    The backend already sets the per-request identity via set_rls_user();
    this makes sure the policies exist. SQLite has no RLS — no-op there.
    """
    if _is_sqlite:
        return
    script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "scripts", "rls.sql")
    if not os.path.exists(script_path):
        print("[rls] scripts/rls.sql not found — skipping")
        return
    with open(script_path, encoding="utf-8") as f:
        sql = f.read()
    # Execute the complete script through raw asyncpg. Splitting on semicolons
    # breaks dollar-quoted CREATE FUNCTION bodies and poisons the transaction.
    raw_dsn = settings.DATABASE_URL or ""
    parts = urlsplit(raw_dsn)
    query = [(key, value) for key, value in parse_qsl(parts.query, keep_blank_values=True) if key.lower() != "pgbouncer"]
    raw_dsn = urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))
    connection = await asyncpg.connect(dsn=raw_dsn, statement_cache_size=0)
    try:
        async with connection.transaction():
            await connection.execute(sql)
    finally:
        await connection.close()
    print("[OK] Row Level Security policies applied")
