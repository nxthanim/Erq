"""SQLAlchemy ORM models matching the existing PostgreSQL schema."""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, DateTime, ForeignKey, CheckConstraint,
    UniqueConstraint, Index, text
)
from sqlalchemy.orm import relationship
from python_backend.database import Base


def _utcnow():
    return datetime.now(timezone.utc)


def _uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    city = Column(String, nullable=True)
    role = Column(String, nullable=False)
    profile_picture = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    skills = Column(Text, nullable=True)
    verified = Column(Integer, default=0, server_default=text("0"))
    rating = Column(Float, default=0.0, server_default=text("0"))
    review_count = Column(Integer, default=0, server_default=text("0"))
    last_active_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Gig(Base):
    __tablename__ = "gigs"

    id = Column(String, primary_key=True, default=_uuid)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    delivery_time = Column(Integer, nullable=False)
    portfolio_images = Column(Text, default="[]")
    active = Column(Integer, default=1, server_default=text("1"))
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=_uuid)
    client_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    budget_min = Column(Float, nullable=False)
    budget_max = Column(Float, nullable=False)
    category = Column(String, nullable=False)
    deadline = Column(DateTime, nullable=True)
    status = Column(String, default="open")
    awarded_to = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Bid(Base):
    __tablename__ = "bids"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    proposal = Column(Text, nullable=True)
    status = Column(String, default="pending")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Message(Base):
    __tablename__ = "messages"

    id = Column(String, primary_key=True, default=_uuid)
    sender_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    receiver_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    message = Column(Text, nullable=True)
    attachment_url = Column(String, nullable=True)
    attachment_name = Column(String, nullable=True)
    attachment_size = Column(Integer, nullable=True)
    attachment_type = Column(String, nullable=True)
    read = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True)
    order_id = Column(String, ForeignKey("orders.id", ondelete="SET NULL"), nullable=True)
    client_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="escrow")
    telebirr_reference = Column(String, nullable=True)
    confirmation_selfie = Column(String, nullable=True)
    confirmation_audio = Column(String, nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Review(Base):
    __tablename__ = "reviews"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String, default="info")
    read = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class SavedGig(Base):
    __tablename__ = "saved_gigs"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    gig_id = Column(String, ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    __table_args__ = (UniqueConstraint("user_id", "gig_id"),)


class EmailVerification(Base):
    __tablename__ = "email_verifications"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=False)
    email_address = Column(String, nullable=False)
    suggested_correction = Column(String, nullable=True)
    status = Column(String, default="pending")
    status_detail = Column(Text, nullable=True)
    is_format_valid = Column(Integer, default=0)
    is_smtp_valid = Column(Integer, default=0)
    is_mx_valid = Column(Integer, default=0)
    mx_records = Column(Text, default="[]")
    email_provider_name = Column(String, nullable=True)
    organization_name = Column(String, nullable=True)
    organization_type = Column(String, nullable=True)
    domain = Column(String, nullable=True)
    domain_age = Column(Integer, default=0)
    is_live_site = Column(Integer, default=0)
    registrar = Column(String, nullable=True)
    date_registered = Column(String, nullable=True)
    date_last_renewed = Column(String, nullable=True)
    date_expires = Column(String, nullable=True)
    score = Column(Float, default=0.0)
    is_free_email = Column(Integer, default=0)
    is_disposable = Column(Integer, default=0)
    is_catchall = Column(Integer, default=0)
    is_role = Column(Integer, default=0)
    is_dmarc_enforced = Column(Integer, default=0)
    is_spf_strict = Column(Integer, default=0)
    address_risk_status = Column(String, default="unknown")
    domain_risk_status = Column(String, default="unknown")
    total_breaches = Column(Integer, default=0)
    date_first_breached = Column(String, nullable=True)
    date_last_breached = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    verified_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class SkillBadge(Base):
    __tablename__ = "skill_badges"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    skill = Column(String, nullable=False)
    badge_type = Column(String, nullable=False)
    issued_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    expires_at = Column(DateTime, nullable=True)


class GigView(Base):
    __tablename__ = "gig_views"

    id = Column(String, primary_key=True, default=_uuid)
    gig_id = Column(String, ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False)
    viewer_ip = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(String, primary_key=True, default=_uuid)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False)
    raised_by = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reason = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    evidence = Column(Text, default="[]")
    status = Column(String, default="pending")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(String, primary_key=True, default=_uuid)
    referrer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    referral_code = Column(String, unique=True, nullable=False)
    total_signups = Column(Integer, default=0)
    total_earned = Column(Float, default=0.0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class ReferralSignup(Base):
    __tablename__ = "referral_signups"

    id = Column(String, primary_key=True, default=_uuid)
    referral_id = Column(String, ForeignKey("referrals.id", ondelete="CASCADE"), nullable=False)
    referred_user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    bonus_given = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String, nullable=False)
    tags = Column(Text, default="[]")
    category = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Order(Base):
    __tablename__ = "orders"

    id = Column(String, primary_key=True, default=_uuid)
    gig_id = Column(String, ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False)
    client_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Float, nullable=False)
    requirements = Column(Text, nullable=True)
    status = Column(String, default="pending")
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class OrderDelivery(Base):
    __tablename__ = "order_deliveries"

    id = Column(String, primary_key=True, default=_uuid)
    order_id = Column(String, ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=True)
    files = Column(Text, default="[]")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class JobDelivery(Base):
    __tablename__ = "job_deliveries"

    id = Column(String, primary_key=True, default=_uuid)
    job_id = Column(String, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    freelancer_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(Text, nullable=True)
    files = Column(Text, default="[]")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class PaymentReceipt(Base):
    __tablename__ = "payment_receipts"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    item_type = Column(String, nullable=False)
    item_id = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    receipt_photo = Column(String, nullable=False)
    receipt_reference = Column(String, nullable=False)
    status = Column(String, default="pending")
    risk_score = Column(Float, default=0.0)
    risk_factors = Column(Text, default="[]")
    admin_notified = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    verified_at = Column(DateTime, nullable=True)


class LoginAudit(Base):
    __tablename__ = "login_audit"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    email = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    action = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class PaymentAudit(Base):
    __tablename__ = "payment_audit"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    transaction_id = Column(String, ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True)
    action = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    details = Column(Text, default="{}")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class PasswordReset(Base):
    __tablename__ = "password_resets"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, nullable=False)
    token = Column(String, unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class Category(Base):
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, unique=True, nullable=False)
    icon = Column(String, default="📋")
    description = Column(Text, default="")
    sort_order = Column(Integer, default=0)
    active = Column(Integer, default=1, server_default=text("1"))
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class BusinessCustomer(Base):
    __tablename__ = "business_customers"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    company = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="active")
    total_spent = Column(Float, default=0.0)
    projects_count = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class BusinessMeeting(Base):
    __tablename__ = "business_meetings"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("business_customers.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    date = Column(DateTime, nullable=False)
    duration = Column(Integer, default=30)
    status = Column(String, default="scheduled")
    meeting_type = Column(String, default="video")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class BusinessInvoice(Base):
    __tablename__ = "business_invoices"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    customer_id = Column(String, ForeignKey("business_customers.id", ondelete="SET NULL"), nullable=True)
    invoice_number = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, default="pending")
    due_date = Column(DateTime, nullable=True)
    paid_date = Column(DateTime, nullable=True)
    line_items = Column(Text, default="[]")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class BusinessTeam(Base):
    __tablename__ = "business_team"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    member_name = Column(String, nullable=False)
    member_email = Column(String, nullable=True)
    role = Column(String, default="member")
    status = Column(String, default="active")
    joined_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class WalletPinAttempt(Base):
    __tablename__ = "wallet_pin_attempts"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    successful = Column(Integer, default=0)
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class UserAgent(Base):
    __tablename__ = "user_agents"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="assistant")
    instructions = Column(Text, default="")
    model = Column(String, default="default")
    avatar = Column(String, nullable=True)
    color = Column(String, default="#16a34a")
    parent_agent_id = Column(String, ForeignKey("user_agents.id", ondelete="SET NULL"), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class AgentConversation(Base):
    __tablename__ = "agent_conversations"

    id = Column(String, primary_key=True, default=_uuid)
    agent_id = Column(String, ForeignKey("user_agents.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, default="New Conversation")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id = Column(String, primary_key=True, default=_uuid)
    conversation_id = Column(String, ForeignKey("agent_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    metadata_ = Column("metadata", Text, default="{}")
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class RateLimitHit(Base):
    """Per-IP API request counter used by the sliding-window rate limiter."""

    __tablename__ = "rate_limit_hits"

    id = Column(String, primary_key=True, default=_uuid)
    ip = Column(String, nullable=False)
    endpoint = Column(String, nullable=True)
    method = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


class BannedIp(Base):
    """Temporarily banned IPs (escalated from repeated rate-limit breaches)."""

    __tablename__ = "banned_ips"

    id = Column(String, primary_key=True, default=_uuid)
    ip = Column(String, nullable=False)
    reason = Column(Text, nullable=True)
    banned_until = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=text("CURRENT_TIMESTAMP"))


# ==========================================================================
# Indexes — mirror scripts/migration.sql so create_all() builds them for
# fresh databases (e.g. local SQLite dev). PostgreSQL production already has
# these via migration.sql; CREATE INDEX IF NOT EXISTS makes it a no-op there.
# ==========================================================================

Index("idx_gigs_freelancer", Gig.freelancer_id)
Index("idx_gigs_category", Gig.category)
Index("idx_jobs_client", Job.client_id)
Index("idx_jobs_status", Job.status)
Index("idx_bids_job", Bid.job_id)
Index("idx_bids_freelancer", Bid.freelancer_id)
Index("idx_messages_participants", Message.sender_id, Message.receiver_id)
Index("idx_messages_created", Message.created_at)
Index("idx_transactions_job", Transaction.job_id)
Index("idx_transactions_client", Transaction.client_id)
Index("idx_transactions_freelancer", Transaction.freelancer_id)
Index("idx_transactions_status", Transaction.status)
Index("idx_reviews_reviewee", Review.reviewee_id)
Index("idx_notifications_user", Notification.user_id)
Index("idx_notifications_read", Notification.user_id, Notification.read)
Index("idx_skill_badges_user", SkillBadge.user_id)
Index("idx_gig_views_gig", GigView.gig_id)
Index("idx_disputes_transaction", Dispute.transaction_id)
Index("idx_disputes_status", Dispute.status)
Index("idx_referrals_referrer", Referral.referrer_id)
Index("idx_referral_signups_referral", ReferralSignup.referral_id)
Index("idx_portfolio_user", PortfolioItem.user_id)
Index("idx_orders_client", Order.client_id)
Index("idx_orders_freelancer", Order.freelancer_id)
Index("idx_orders_status", Order.status)
Index("idx_orders_transaction", Order.transaction_id)
Index("idx_order_deliveries_order", OrderDelivery.order_id)
Index("idx_job_deliveries_job", JobDelivery.job_id)
Index("idx_payment_receipts_user", PaymentReceipt.user_id)
Index("idx_payment_receipts_reference", PaymentReceipt.receipt_reference)
Index("idx_login_audit_user", LoginAudit.user_id)
Index("idx_login_audit_email", LoginAudit.email)
Index("idx_payment_audit_user", PaymentAudit.user_id)
Index("idx_payment_audit_txn", PaymentAudit.transaction_id)
Index("idx_password_resets_token", PasswordReset.token)
Index("idx_password_resets_email", PasswordReset.email)
Index("idx_categories_active", Category.active)
Index("idx_business_customers_user", BusinessCustomer.user_id)
Index("idx_business_meetings_user", BusinessMeeting.user_id)
Index("idx_business_invoices_user", BusinessInvoice.user_id)
Index("idx_business_team_user", BusinessTeam.user_id)
Index("idx_user_agents_user", UserAgent.user_id)
Index("idx_user_agents_parent", UserAgent.parent_agent_id)
Index("idx_agent_conversations_agent", AgentConversation.agent_id)
Index("idx_agent_messages_conversation", AgentMessage.conversation_id)
Index("idx_email_verifications_email", EmailVerification.email)
Index("idx_email_verifications_user", EmailVerification.user_id)
Index("idx_rate_limit_ip_time", RateLimitHit.ip, RateLimitHit.created_at)
Index("idx_banned_ips_ip", BannedIp.ip)
