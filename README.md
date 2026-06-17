# 🧠 DocuMind AI Pro

**Enterprise document intelligence platform — light mode, production-grade**

Built by **Mohan Kumar S** — Founder, MOH AI TECH · Namakkal, Tamil Nadu 🇮🇳

Chat with any document. Upload PDF, Word, CSV, Excel — ask questions, get cited answers, generate summaries and quizzes, build AI-powered dashboards from your data.

---

## ✨ Features

- 💬 **Chat with documents** — RAG-powered Q&A with cited sources, streaming responses
- 📊 **AI dashboards** — Upload CSV/Excel → auto bar/line/pie/scatter charts + AI Q&A on data
- 📝 **Smart summarizer** — 3 levels: Quick, Detailed, Full breakdown
- 🎯 **Quiz generator** — Auto MCQ + True/False with explanations and scoring
- 🌐 **Multilingual** — English, Tamil, Hindi, Telugu, German
- 🎨 **Premium light-mode UI** — Clean, modern, ₹50L-product-grade design system
- 🔒 **Privacy-first** — Documents parsed client-side, only relevant chunks sent to AI

## ⚙️ Tech Stack

| Layer | Tech | Cost |
|---|---|---|
| Framework | Next.js 14 (App Router) | Free |
| AI | Google Gemini 2.5 Flash | Free |
| Retrieval | Custom TF-IDF + cosine similarity | Free |
| Charts | Chart.js + react-chartjs-2 | Free |
| File parsing | PDF.js, Mammoth, SheetJS | Free |
| State | Zustand | Free |
| Hosting | Vercel | Free tier |

**Total infra cost: ₹0** until you scale.

## 🚀 Quick Start

```bash
npm install
cp .env.example .env.local
# Add your free Groq API key from console.groq.com
npm run dev
```

Open `http://localhost:3000`

## 🌐 Deploy to Vercel

1. Push to GitHub (done ✅)
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import `DocuMind-AI-Pro` repo
4. Add environment variable: `GROQ_API_KEY`
5. Deploy

## 📁 Structure

```
app/
├── page.tsx              # Landing page
├── layout.tsx            # Root layout
├── globals.css           # Light-mode design system
├── app/page.tsx          # Main application (upload/chat/dashboard/summary/quiz)
└── api/
    ├── chat/route.ts     # Streaming RAG chat (Groq)
    ├── summary/route.ts  # AI summarization
    ├── quiz/route.ts     # AI quiz generation
    └── health/route.ts   # Health check
lib/
├── pipeline.ts           # Chunking, TF-IDF, search
└── store.ts              # Zustand state
```

## 🏢 Built by

**MOH AI TECH** — Custom AI systems for businesses worldwide
Founder: Mohan Kumar S · B.Tech AI & Data Science
Namakkal, Tamil Nadu, India · MSME Registered
moh-ai-tech.vercel.app · info@mohaitech.in
