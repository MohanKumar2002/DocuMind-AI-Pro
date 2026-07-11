"""
DocuMind AI Pro — FastAPI Backend
Built by MOH AI TECH · Namakkal, Tamil Nadu
Founder: Mohan Kumar S
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import time
import logging

from config import settings
from routers import auth, documents, chat, dashboard, quiz, summary, payments, health, extraction

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)

# ── App ──
app = FastAPI(
    title="DocuMind AI Pro",
    description="Enterprise document intelligence platform by MOH AI TECH",
    version=settings.APP_VERSION,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# ── Middleware ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_process_time(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    response.headers["X-Process-Time"] = str(round(time.time() - start, 4))
    response.headers["X-Powered-By"] = "MOH AI TECH"
    return response

# ── Routers ──
app.include_router(health.router,     prefix="/api",          tags=["Health"])
app.include_router(auth.router,       prefix="/api/auth",     tags=["Auth"])
app.include_router(documents.router,  prefix="/api/docs",     tags=["Documents"])
app.include_router(chat.router,       prefix="/api/chat",     tags=["Chat"])
app.include_router(dashboard.router,  prefix="/api/dashboard",tags=["Dashboard"])
app.include_router(quiz.router,       prefix="/api/quiz",     tags=["Quiz"])
app.include_router(summary.router,    prefix="/api/summary",  tags=["Summary"])
app.include_router(payments.router,   prefix="/api/payments", tags=["Payments"])
app.include_router(extraction.router, prefix="/api/extraction", tags=["Extraction"])

# ── Exception handlers ──
@app.exception_handler(404)
async def not_found(request, exc):
    return JSONResponse({"error": "Not found", "path": str(request.url)}, status_code=404)

@app.exception_handler(500)
async def server_error(request, exc):
    logger.error(f"500 error: {exc}")
    return JSONResponse({"error": "Internal server error"}, status_code=500)

@app.on_event("startup")
async def startup():
    logger.info("🚀 DocuMind AI Pro starting up...")
    logger.info(f"   Environment: {settings.ENVIRONMENT}")
    logger.info(f"   Version: {settings.APP_VERSION}")
    logger.info(f"   AI Model: {settings.GROQ_MODEL}")
    logger.info(f"   Embedding: {settings.HF_EMBEDDING_MODEL}")

@app.on_event("shutdown")
async def shutdown():
    logger.info("DocuMind AI Pro shutting down...")
