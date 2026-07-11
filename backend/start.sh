#!/bin/bash
# DocuMind AI Pro — Backend startup script
# Built by MOH AI TECH · Namakkal, Tamil Nadu

echo "🚀 Starting DocuMind AI Pro Backend..."
echo "   Built by Mohan Kumar S — MOH AI TECH"
echo ""

# Check Python version
python3 --version || { echo "❌ Python 3.9+ required"; exit 1; }

# Create virtual environment if not exists
if [ ! -d "venv" ]; then
  echo "📦 Creating virtual environment..."
  python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt --quiet

# Create directories
mkdir -p uploads chromadb

# Check .env
if [ ! -f ".env" ]; then
  echo "⚠️  No .env file found. Copying from .env.example..."
  cp .env.example .env
  echo "✏️  Please edit .env with your API keys before running."
  echo "   Required: GROQ_API_KEY, SUPABASE_URL, SUPABASE_KEY, JWT_SECRET"
  exit 1
fi

# Start server
echo "✅ Starting FastAPI server on http://localhost:8000"
echo "   API docs: http://localhost:8000/api/docs"
echo ""
uvicorn main:app --reload --host 0.0.0.0 --port 8000
