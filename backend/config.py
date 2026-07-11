import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    APP_NAME: str = "DocuMind AI Pro"
    APP_VERSION: str = "3.0.0"
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173"

    # Database (PostgreSQL)
    DATABASE_URL: str = "postgresql://postgres:0000@localhost:5432/postgres"

    # AI
    GROQ_API_KEY: str
    GROQ_MODEL: str = "llama-3.1-70b-versatile"
    GROQ_MODEL_FAST: str = "llama-3.1-8b-instant"  # faster, for summaries
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"

    # Supabase (Optional fallback)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None

    # Razorpay
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 10080  # 7 days

    # Storage
    UPLOAD_DIR: str = "./uploads"
    CHROMA_DIR: str = "./chromadb"
    MAX_FILE_SIZE_MB: int = 50

    # Plans
    PLAN_LIMITS: dict = {
        "free":     {"docs": 3,      "questions": 20,  "pages": 50},
        "student":  {"docs": 50,     "questions": 500, "pages": 300},
        "pro":      {"docs": 200,    "questions": 5000,"pages": 1000},
        "business": {"docs": 999999, "questions": 999999, "pages": 999999},
    }

    class Config:
        env_file = ".env.local" if os.path.isdir(".env") else ".env"

settings = Settings()
