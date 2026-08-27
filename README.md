# 🏪 Gebeya - Ethiopian Freelance Marketplace

Gebeya is a full-stack freelance marketplace web application designed for the Ethiopian market. It connects clients with talented freelancers across categories like Translation, Graphic Design, Video Editing, Web Development, and more.

## ✨ Features

### For Clients
- Post jobs with detailed descriptions and budget ranges
- Browse freelancer profiles and gigs
- Send direct messages to freelancers
- Award jobs and manage the entire workflow
- Secure payments via TeleBirr escrow system
- Rate and review freelancers after completion

### For Freelancers
- Create and manage gigs with portfolio images
- Browse and bid on job postings
- Real-time messaging with clients
- Receive payments through TeleBirr escrow
- Build reputation through ratings and reviews

### For Admins
- Comprehensive dashboard with platform statistics
- User management with verification badges
- Monitor all gigs, jobs, and transactions
- Resolve payment disputes (release or refund)

### General Features
- 🔍 Advanced search with category filters and price range
- 💬 Real-time chat via WebSockets (Socket.io)
- 🔒 Secure JWT authentication
- 💰 TeleBirr payment integration (sandbox)
- 🌐 Bilingual support (English & Amharic)
- 📱 Responsive desktop-first design
- ⭐ Rating and review system

## 🚀 Tech Stack

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Python 3.11+ · FastAPI (ASGI)
- **Database**: Supabase Postgres (via SQLAlchemy async connection)
- **Authentication**: Clerk session tokens with a legacy JWT fallback for local recovery
- **Real-time**: WebSockets (Socket.io-compatible endpoint)
- **Payments**: Chapa + TeleBirr escrow flow
- **AI**: NVIDIA NIM API (chat, image generation, gig generator)
- **Deployment**: Vercel (Python serverless functions + static client)

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- (Optional) PostgreSQL for production deployment

## 🛠️ Quick Start (Local Development)

### 1. Install Dependencies

```bash
# Python backend
pip install -r requirements.txt

# React client
cd client && npm install
```

### 2. Environment Variables

**Backend** (root `.env` or exported vars):
```env
SUPABASE_DB_URL=postgresql://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...          # backend only; never expose to Vite
DATABASE_URL=...                       # optional legacy alias; Supabase URL is preferred
JWT_SECRET=your-secret-key-here        # only needed for legacy local recovery
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CHAPA_SECRET_KEY=...                  # optional — payment gateway
NVIDIA_API_KEY=...                    # optional — AI features
RESEND_API_KEY=...                    # optional — transactional email
```

**Frontend** (`client/.env`):
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...   # optional — enables Clerk auth UI
```

### 3. Run the Application

```bash
# Backend API (auto-creates tables + seeds on first start)
python -m uvicorn python_backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd client && npm run dev
```

- **Backend API + Swagger docs**: http://localhost:8000
- **Frontend**: http://localhost:5173

### 4. Access the App

Open http://localhost:5173 in your browser.

**Demo Accounts:**
- Register as a **Freelancer** to create gigs and bid on jobs
- Register as a **Client** to post jobs and hire freelancers
- Seeded **Admin**: `admin@gebeya.et` / `admin123` (legacy JWT mode only)

## 📦 Production Build

```bash
# Build the client
cd client && npm run build
```

## ☁️ Deployment (Vercel)

`vercel.json` wires everything up:
- Builds the React client into `client/dist`
- Serves `api/index.py` (FastAPI ASGI app) for all `/api/*` and `/socket.io/*` requests
- Requires the env vars above set in the Vercel project (use a real `DATABASE_URL`)

**First deploy with a fresh Postgres database:** run `scripts/migration.sql` once against
the production database (e.g. `psql "$DATABASE_URL" -f scripts/migration.sql`) to create the
base tables. Idempotent schema extras (`tips`, `ads`, `clerk_id`, …) are ensured automatically
on every cold start, but the base tables are applied manually.

```bash
vercel --prod
```

## 🔐 Security

**Row Level Security (PostgreSQL):** sensitive tables (`messages`, `transactions`, `orders`,
`notifications`, `saved_gigs`, `bids`, `disputes`, `wallet_pin_attempts`, `payment_receipts`,
`login_audit`, business CRM tables, AI agents, `ads`) are protected by RLS policies. The backend
sets the request identity per transaction (`set_config('app.current_user_id', …)`), so users can
only read/write their own rows; admins see everything; anonymous requests see nothing private.
Apply once after the base schema:

```bash
psql "$DATABASE_URL" -f scripts/rls.sql
```

Public tables (`users`, `gigs`, `jobs`, `categories`, `reviews`, …) stay open by design, but the
API strips emails/phones from public user responses (see `python_backend/routers/users.py`).

**Secrets:**
- All API keys live only in backend environment variables (never in the client bundle).
- Client `.env` holds only `VITE_CLERK_PUBLISHABLE_KEY` (public by design).
- Production refuses to boot with a weak/default `JWT_SECRET` or without `DATABASE_URL`
  (see `python_backend/config.py`).
- The Chapa public key is served by `/api/payments/chapa/initiate` from `CHAPA_PUBLIC_KEY` —
  no payment keys are hardcoded in the frontend.

**Rate limiting & IP bans:** every `/api/*` request is counted per IP against a sliding window
(DB-backed, so it works on serverless). Buckets: signup (tightest), auth (login / forgot-password /
clerk sync), and general. Repeated 429 breaches auto-ban an IP for a cooldown. All knobs live in env
(`RATE_LIMIT_*`, `AUTH_RATE_LIMIT_MAX`, `SIGNUP_RATE_LIMIT_MAX`, `BAN_*` — see `.env.example`).
Admins can inspect and unban IPs under **Admin → Security** or via
`GET/DELETE /api/admin/security/banned-ips` and `GET /api/admin/security/rate-limits`.

**Indexes:** `scripts/migration.sql` defines the PostgreSQL indexes; the SQLAlchemy models in
`python_backend/models.py` mirror them so fresh/local SQLite databases get the same indexes
(including `rate_limit_hits(ip, created_at)` and `banned_ips(ip)`).

## 🗂️ Project Structure

```
gebeya/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React contexts (Auth, Language, Socket, Theme)
│   │   ├── utils/         # Utilities (API client)
│   │   └── App.jsx        # Main app with routing
│   └── ...
├── python_backend/         # FastAPI backend
│   ├── auth.py            # JWT + Clerk verification
│   ├── models.py          # SQLAlchemy ORM models
│   ├── routers/           # API route modules (auth, gigs, jobs, orders…)
│   ├── websocket/         # Socket.io-compatible WS handler
│   └── main.py            # ASGI app entry point
├── api/index.py           # Vercel serverless entry point
├── scripts/               # migration.sql + helper scripts
├── requirements.txt       # Python dependencies
└── README.md
```

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/login` | POST | Login |
| `/api/auth/me` | GET | Get current user |
| `/api/gigs` | GET | List gigs (with filters) |
| `/api/gigs` | POST | Create gig (freelancer) |
| `/api/jobs` | GET | List jobs |
| `/api/jobs` | POST | Create job (client) |
| `/api/jobs/:id/bid` | POST | Place a bid (freelancer) |
| `/api/messages` | POST | Send a message |
| `/api/messages/conversations` | GET | Get conversations |
| `/api/payments/initiate` | POST | Initiate TeleBirr payment |
| `/api/payments/release` | POST | Release escrow payment |
| `/api/admin/stats` | GET | Platform statistics |
| `/api/admin/users/:id/verify` | PUT | Toggle user verification |

## 🌍 Language Support

Toggle between English and Amharic using the language button in the sidebar. Translations are stored in a JSON-like structure within the `LanguageContext`.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this for learning and commercial purposes.

## 🙏 Acknowledgments

- Built for the Ethiopian freelance community
- TeleBirr payment integration (sandbox)
- All the open-source libraries that made this possible

---

**Made with ❤️ for Ethiopia 🇪🇹**
