"""Application configuration loaded from environment variables."""

import os
from typing import Optional

try:
    from dotenv import load_dotenv

    # Load the repo-root .env (JWT_SECRET, CLERK keys, NVIDIA_API_KEY, ...).
    # Python does not read .env files by itself — without this every env-driven
    # feature (Clerk auth, AI, email) silently disabled itself locally.
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))
except ImportError:
    pass  # python-dotenv missing -> rely on real environment (e.g. Vercel)


class Settings:
    """Application settings with sensible defaults for development."""

    # Database — Supabase Postgres is preferred; DATABASE_URL remains a
    # backwards-compatible override for existing deployments.
    SUPABASE_DB_URL: str = os.getenv("SUPABASE_DB_URL", "")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_PUBLISHABLE_KEY: Optional[str] = os.getenv("SUPABASE_PUBLISHABLE_KEY") or os.getenv("SUPABASE_ANON_KEY")
    SUPABASE_SECRET_KEY: Optional[str] = os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    # Backwards-compatible alias used by existing database integrations.
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_SECRET_KEY")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        SUPABASE_DB_URL or os.getenv("POSTGRES_URL", os.getenv("POSTGRES_PRISMA_URL", "")),
    )

    # JWT — no production-safe fallback; a weak default is rejected below
    JWT_SECRET: str = os.getenv("JWT_SECRET", "erq-fallback-dev-secret-python-2024")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_DAYS: int = 7

    # Clerk Authentication
    CLERK_PUBLISHABLE_KEY: str = os.getenv("CLERK_PUBLISHABLE_KEY", "")
    CLERK_SECRET_KEY: str = os.getenv("CLERK_SECRET_KEY", "")
    CLERK_FRONTEND_API: str = os.getenv("CLERK_FRONTEND_API", "")
    CLERK_JWKS_URL: str = os.getenv("CLERK_JWKS_URL", "")

    # Chapa Payment Gateway — merchant id is not a credential, but keep it env-driven
    CHAPA_MERCHANT_ID: str = os.getenv("CHAPA_MERCHANT_ID", "")
    CHAPA_SECRET_KEY: Optional[str] = os.getenv("CHAPA_SECRET_KEY")
    CHAPA_PUBLIC_KEY: Optional[str] = os.getenv("CHAPA_PUBLIC_KEY")
    CHAPA_ENCRYPTION_KEY: Optional[str] = os.getenv("CHAPA_ENCRYPTION_KEY")

    # NVIDIA AI
    NVIDIA_API_KEY: Optional[str] = os.getenv("NVIDIA_API_KEY")

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")
    RESEND_FROM: str = os.getenv(
        "RESEND_FROM", "Erq Marketplace <onboarding@resend.dev>"
    )

    # URLs
    CLIENT_URL: str = os.getenv("CLIENT_URL", "http://localhost:5173")
    DOMAIN: str = os.getenv("DOMAIN", "gebeya.et")
    DOMAIN_PROTOCOL: str = os.getenv("DOMAIN_PROTOCOL", "https")

    # Admin
    ADMIN_EMAIL: str = "auxtechnologies@proton.me"

    # Server
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    # Environment
    VERCEL: bool = os.getenv("VERCEL", "").lower() == "true"
    VERCEL_URL: Optional[str] = os.getenv("VERCEL_URL")
    VERCEL_BRANCH_URL: Optional[str] = os.getenv("VERCEL_BRANCH_URL")
    NODE_ENV: str = os.getenv("NODE_ENV", "development")
    # Never seed demo/admin/agent records unless explicitly requested.
    SEED_DEFAULT_DATA: bool = os.getenv("SEED_DEFAULT_DATA", "false").lower() == "true"
    # Supabase schemas are managed through explicit migrations, not every boot.
    MANAGE_SCHEMA_ON_STARTUP: bool = os.getenv(
        "MANAGE_SCHEMA_ON_STARTUP",
        "false" if os.getenv("SUPABASE_URL") else "true",
    ).lower() == "true"
    APPLY_RLS_ON_STARTUP: bool = os.getenv(
        "APPLY_RLS_ON_STARTUP",
        "false" if os.getenv("SUPABASE_URL") else "true",
    ).lower() == "true"

    # Rate limiting (DB-backed, works on serverless)
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_WINDOW_MINUTES: int = int(os.getenv("RATE_LIMIT_WINDOW_MINUTES", "15"))
    RATE_LIMIT_MAX_REQUESTS: int = int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "200"))
    AUTH_RATE_LIMIT_MAX: int = int(os.getenv("AUTH_RATE_LIMIT_MAX", "20"))
    SIGNUP_RATE_LIMIT_MAX: int = int(os.getenv("SIGNUP_RATE_LIMIT_MAX", "5"))
    # IP ban: enforced when an IP exceeds the limit by this many times
    BAN_THRESHOLD_MULTIPLIER: int = int(os.getenv("BAN_THRESHOLD_MULTIPLIER", "5"))
    BAN_DURATION_MINUTES: int = int(os.getenv("BAN_DURATION_MINUTES", "60"))

    @property
    def is_production(self) -> bool:
        return self.NODE_ENV == "production"

    @property
    def allowed_origins(self) -> list[str]:
        origins = [
            self.CLIENT_URL,
            "http://localhost:5173",
            "http://localhost:8000",
            "http://localhost:5000",
            f"{self.DOMAIN_PROTOCOL}://{self.DOMAIN}",
            f"{self.DOMAIN_PROTOCOL}://www.{self.DOMAIN}",
        ]
        if self.VERCEL_URL:
            origins.append(f"https://{self.VERCEL_URL}")
        if self.VERCEL_BRANCH_URL:
            origins.append(f"https://{self.VERCEL_BRANCH_URL}")
        return origins

    @property
    def cors_origin_regex(self) -> Optional[str]:
        """Match any localhost/127.0.0.1 dev origin (Vite may pick 5173/5174/...).

        Explicit origins stay authoritative; this regex only covers the local
        dev browser (any port), so the front end and API never CORS-fail locally.
        """
        if self.NODE_ENV != "production":
            return r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$"
        return None


settings = Settings()

# ====== Production guardrails ======
_INSECURE_JWT_SECRETS = {
    "erq-fallback-dev-secret-python-2024",
    "gebeya-dev-secret-key-2024",
    "your-256-bit-random-secret-here",
}

if settings.is_production:
    if not settings.JWT_SECRET or settings.JWT_SECRET in _INSECURE_JWT_SECRETS:
        raise RuntimeError(
            "JWT_SECRET must be set to a strong random value in production. "
            'Generate one with: python -c "import secrets; print(secrets.token_hex(32))"'
        )
    if not settings.DATABASE_URL:
        raise RuntimeError("SUPABASE_DB_URL (or DATABASE_URL) must be set in production")
