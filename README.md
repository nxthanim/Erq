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
- **Backend**: Node.js + Express
- **Database**: SQLite (local) / PostgreSQL (production)
- **Authentication**: JWT (JSON Web Tokens)
- **Real-time**: Socket.io
- **Payments**: TeleBirr Merchant API (sandbox)
- **File Uploads**: Multer

## 📋 Prerequisites

- Node.js 18+ and npm
- (Optional) PostgreSQL for production deployment

## 🛠️ Quick Start (Local Development)

### 1. Clone and Install

```bash
# Clone the repository
git clone <your-repo-url>
cd gebeya

# Install all dependencies (server & client)
npm run install:all
```

### 2. Environment Variables

Copy the example env file (defaults work for local development):

```bash
cp .env.example .env
```

Edit `.env` if needed:
```env
PORT=5000
JWT_SECRET=your-secret-key-here
DATABASE_URL=sqlite:./data/gebeya.db
```

### 3. Run the Application

```bash
# Run both server and client in development mode
npm run dev
```

This starts:
- **Backend API**: http://localhost:5000
- **Frontend**: http://localhost:5173

### 4. Access the App

Open http://localhost:5173 in your browser.

**Demo Accounts (created on signup):**
- Register as a **Freelancer** to create gigs and bid on jobs
- Register as a **Client** to post jobs and hire freelancers

## 📦 Production Build

```bash
# Build the client
npm run build

# Start production server
npm start
```

## ☁️ Deployment to Render

1. Push your code to GitHub
2. Create a new **Web Service** on Render
3. Connect your repository
4. Use these settings:
   - **Build Command**: `npm run setup`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all variables from `.env`

### For PostgreSQL on Render:
Replace `DATABASE_URL` with your Render PostgreSQL URL:
```
DATABASE_URL=postgresql://user:password@host:5432/gebeya
```

## 🗂️ Project Structure

```
gebeya/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── context/       # React contexts (Auth, Language, Socket)
│   │   ├── utils/         # Utilities (API client)
│   │   └── App.jsx        # Main app with routing
│   └── ...
├── server/                 # Express backend
│   ├── config/            # Database config
│   ├── middleware/         # Auth middleware, file upload
│   ├── models/            # Database schema
│   ├── routes/            # API routes
│   ├── socket/            # Socket.io handler
│   └── index.js           # Server entry point
├── uploads/               # File uploads directory
├── translations/          # Language files (English, Amharic)
├── .env.example           # Environment variables template
├── package.json           # Server dependencies
└── README.md              # This file
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
