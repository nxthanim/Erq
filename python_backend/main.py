"""FastAPI application entry point with all routes, middleware, and WebSocket support.

This module creates the ASGI app that can be:
1. Run directly: `uvicorn python_backend.main:app --reload`
2. Deployed on Vercel: via `api/index.py`
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from python_backend.config import settings
from python_backend.database import init_db, ensure_extra_columns, engine, apply_rls

# Import routers
from python_backend.routers.auth import router as auth_router
from python_backend.routers.users import router as users_router
from python_backend.routers.gigs import router as gigs_router
from python_backend.routers.jobs import router as jobs_router
from python_backend.routers.messages import router as messages_router
from python_backend.routers.orders import router as orders_router
from python_backend.routers.payments import router as payments_router
from python_backend.routers.reviews import router as reviews_router
from python_backend.routers.admin import router as admin_router
from python_backend.routers.features import router as features_router
from python_backend.routers.ai import router as ai_router
from python_backend.routers.categories import router as categories_router
from python_backend.routers.business import router as business_router
from python_backend.routers.agents import router as agents_router
from python_backend.routers.wallet import router as wallet_router
from python_backend.routers.analytics import router as analytics_router
from python_backend.routers.ads import router as ads_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize resources on startup, clean up on shutdown."""
    # Local development may create missing tables; Supabase uses explicit
    # migrations so startup does not repeatedly run DDL through the pooler.
    if not settings.VERCEL and settings.MANAGE_SCHEMA_ON_STARTUP:
        try:
            await init_db()
            print("[OK] Database tables initialized")
        except Exception as e:
            print(f"[WARN] DB init skipped: {e}")

    if settings.MANAGE_SCHEMA_ON_STARTUP:
        try:
            await ensure_extra_columns()
            print("[OK] Extra schema columns ensured")
        except Exception as e:
            print(f"[WARN] Extra columns check skipped: {e}")

    if settings.APPLY_RLS_ON_STARTUP:
        try:
            await apply_rls()
            print("[OK] Row Level Security policies applied")
        except Exception as e:
            print(f"[WARN] RLS apply skipped: {e}")

    yield

    # Shutdown: dispose engine
    await engine.dispose()


app = FastAPI(
    title="Erq Marketplace API",
    description="Ethiopian Freelance Marketplace - Python FastAPI Backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.VERCEL else None,
    redoc_url="/redoc" if not settings.VERCEL else None,
)

# ====== CORS Middleware ======
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
    max_age=86400,
)

# ====== Security Headers Middleware ======
@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    return response


# ====== Rate Limiting & IP Ban Middleware (outermost) ======
@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """DB-backed per-IP rate limiting with automatic temporary IP bans."""
    from python_backend.ratelimit import enforce_rate_limits
    return await enforce_rate_limits(request, call_next)


# ====== Register Routers ======
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(gigs_router)
app.include_router(jobs_router)
app.include_router(messages_router)
app.include_router(orders_router)
app.include_router(payments_router)
app.include_router(reviews_router)
app.include_router(admin_router)
app.include_router(features_router)
app.include_router(ai_router)
app.include_router(categories_router)
app.include_router(business_router)
app.include_router(agents_router)
app.include_router(wallet_router)
app.include_router(analytics_router)
app.include_router(ads_router)


# ====== WebSocket Route ======
from fastapi import WebSocket, WebSocketDisconnect

@app.websocket("/socket.io/")
@app.websocket("/socket.io/{path:path}")
async def websocket_endpoint(websocket: WebSocket, path: str = ""):
    """WebSocket endpoint for real-time messaging (compatible with existing client)."""
    from python_backend.websocket.handler import handle_websocket
    await handle_websocket(websocket)


# ====== Health Check ======
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": os.popen("date").read().strip()}


# ====== Static Files (for local development) ======
if not settings.VERCEL:
    static_dir = os.path.join(os.path.dirname(__file__), "../client/dist")
    if os.path.exists(static_dir):
        app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


# ====== Global Error Handler ======
@app.exception_handler(Exception)
async def global_error_handler(request: Request, exc: Exception):
    """Catch-all error handler that returns JSON instead of HTML."""
    status_code = getattr(exc, "status_code", 500)
    detail = getattr(exc, "detail", str(exc))

    # In production, hide internal error details
    if settings.is_production and status_code == 500:
        detail = "Internal server error"

    return JSONResponse(
        status_code=status_code,
        content={"error": detail},
    )


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "python_backend.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True,
    )
