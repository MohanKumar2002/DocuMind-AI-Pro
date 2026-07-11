# 🧠 DocuMind AI Pro

**Enterprise document intelligence platform**  
Built by **Mohan Kumar S** — Founder, MOH AI TECH · Namakkal, Tamil Nadu 🇮🇳

---

## 🏗️ Architecture

```
documind-pro/
├── backend/                    # Python FastAPI
│   ├── main.py                 # App entry point + middleware
│   ├── config.py               # Settings + plan limits
│   ├── database.py             # Supabase + ChromaDB clients
│   ├── requirements.txt        # Python dependencies
│   ├── start.sh                # One-command startup
│   └── routers/
│       ├── auth.py             # Signup, login, JWT
│       ├── documents.py        # Upload → extract → chunk → embed → index
│       ├── chat.py             # RAG pipeline + Groq streaming
│       ├── summary.py          # AI summarization (3 levels)
│       ├── quiz.py             # Quiz generation + submission
│       ├── dashboard.py        # CSV/Excel AI dashboard
│       ├── payments.py         # Razorpay subscription billing
│       └── health.py           # Health check endpoint
│
└── frontend/                   # React + Vite
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx            # React entry point
        ├── App.jsx             # Router + auth guard
        ├── index.css           # Global design system
        ├── store.js            # Zustand global state
        ├── workers/
        │   └── aiPipeline.worker.js  # Web Worker — AI off main thread
        ├── utils/
        │   └── api.js          # Axios client + all API calls
        ├── hooks/
        │   └── useDocuments.js # Document fetch/delete hook
        ├── components/
        │   ├── layout/
        │   │   ├── AppLayout.jsx       # Sidebar + header + outlet
        │   │   └── AppLayout.module.css
        │   └── ui/
        │       └── HardwareWarning.jsx # Mobile/WebGPU warning
        └── pages/
            ├── LandingPage.jsx    # Marketing homepage
            ├── LoginPage.jsx      # Auth
            ├── SignupPage.jsx     # Auth
            ├── UploadPage.jsx     # Drag-drop + pipeline viz
            ├── ChatPage.jsx       # Streaming RAG chat
            ├── DashboardPage.jsx  # CSV/Excel charts + AI Q&A
            ├── SummaryPage.jsx    # AI summarizer
            ├── QuizPage.jsx       # Quiz generator
            ├── PricingPage.jsx    # Pricing tiers
            └── ProfilePage.jsx    # User profile + usage
```

---

## ⚙️ Tech Stack

| Layer | Technology | Cost |
|-------|-----------|------|
| **AI LLM** | Groq API — Llama 3.1 70B | Free (14,400 req/day) |
| **Embeddings** | HuggingFace `all-MiniLM-L6-v2` | Free (local) |
| **Vector DB** | ChromaDB (persistent) | Free (local) |
| **Auth + DB** | Supabase (PostgreSQL + RLS) | Free (500MB) |
| **Payments** | Razorpay | Free (2% per txn) |
| **Frontend** | React + Vite | Free |
| **Backend** | FastAPI + Python | Free |
| **Hosting** | Vercel (frontend) + Railway (backend) | Free tier |
| **Web Worker** | Browser Web Worker | Free (browser) |
| **PDF parsing** | PyMuPDF + PDF.js | Free |
| **OCR** | Tesseract.js | Free |

**Total monthly infrastructure cost: ₹0** until you scale beyond free tiers.

---

## 🚀 Setup Guide

### Step 1 — Get your free API keys

| Service | URL | What you need |
|---------|-----|---------------|
| Groq | https://console.groq.com | `GROQ_API_KEY` |
| Supabase | https://supabase.com | URL + anon key + service key |
| Razorpay | https://razorpay.com | Key ID + Key Secret |

### Step 2 — Backend setup

```bash
cd backend

# Copy env file
cp .env.example .env
# Edit .env with your keys

# Run with one command
chmod +x start.sh
./start.sh
```

Backend runs at: `http://localhost:8000`  
API docs at: `http://localhost:8000/api/docs`

### Step 3 — Supabase database setup

1. Go to your Supabase project → SQL Editor
2. Copy the SQL from `database.py` → `SUPABASE_SCHEMA`
3. Run it — creates all tables with Row Level Security

### Step 4 — Frontend setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env
cp .env.example .env
# Add your Supabase URL, anon key, Razorpay key

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

### Step 5 — Build for production

```bash
# Frontend build
cd frontend && npm run build
# Deploy /dist folder to Vercel

# Backend deploy to Railway
# 1. Push backend folder to GitHub
# 2. Connect Railway to your repo
# 3. Add environment variables
# 4. Deploy — Railway auto-detects FastAPI
```

---

## 🌐 Deployment (subdomain strategy)

```
mohaitech.com          → GoDaddy/Framer (marketing site)
app.mohaitech.com      → Vercel (React frontend)  ← CNAME to vercel
api.mohaitech.com      → Railway (FastAPI backend) ← CNAME to railway
```

**DNS setup in GoDaddy:**
1. Add CNAME: `app` → `cname.vercel-dns.com`
2. Add CNAME: `api` → `your-app.up.railway.app`

Then in Vercel, add custom domain: `app.mohaitech.com`

---

## 💰 Pricing tiers (built-in)

| Plan | Price (INR) | Price (USD) | Docs/month | Questions/month |
|------|-------------|-------------|------------|-----------------|
| Free | ₹0 | $0 | 3 | 20/day |
| Student | ₹299 | $4 | 50 | 500 |
| Professional | ₹999 | $12 | 200 | 5,000 |
| Business | ₹4,999 | $60 | Unlimited | Unlimited |

---

## 🔒 Privacy architecture

- **Documents** are uploaded to your FastAPI server and processed locally
- **Text** is chunked and embedded using HuggingFace (runs on your server)
- **Vectors** are stored in ChromaDB on your own server
- **AI responses** use Groq — only the relevant chunks are sent, never the full document
- **Supabase** stores only metadata (file name, chunk count, user ID) — never document content
- For **full on-premise** deployment, replace Supabase with self-hosted PostgreSQL and disable Groq (use Ollama locally)

---

## 📈 Revenue path to ₹1 Crore

| Month | Action | Revenue |
|-------|--------|---------|
| Jul 2026 | Launch → Product Hunt | ₹1.9L |
| Aug 2026 | College outreach → Student plan | ₹4.8L |
| Sep 2026 | Business plan + enterprise | ₹9.5L |
| Oct 2026 | AppSumo lifetime deal 🔥 | ₹38L |
| Nov 2026 | Scale + enterprise deals | ₹22L |
| Dec 2026 | ₹1Cr target reached ✅ | ₹24L |

---

## 🛠️ Upgrade roadmap

- [ ] **v3.1** — Tesseract OCR for scanned PDFs
- [ ] **v3.2** — Voice input (Web Speech API)
- [ ] **v3.3** — Team collaboration + shared workspaces
- [ ] **v3.4** — WhatsApp bot integration
- [ ] **v3.5** — On-premise Docker deployment
- [ ] **v4.0** — Neural embeddings (sentence-transformers in browser via ONNX)

---

## 🏢 Built by

**MOH AI TECH** — Custom AI systems for businesses worldwide  
Founder: Mohan Kumar S · B.Tech AI & Data Science  
Location: Namakkal, Tamil Nadu, India  
Website: moh-ai-tech.vercel.app  
Email: info@mohaitech.in  
MSME Registered
