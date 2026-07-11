from fastapi import APIRouter
from config import settings
import time

router = APIRouter()
START_TIME = time.time()

@router.get("/health")
async def health():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "uptime_seconds": round(time.time() - START_TIME),
        "environment": settings.ENVIRONMENT,
        "built_by": "MOH AI TECH · Namakkal, Tamil Nadu",
        "founder": "Mohan Kumar S"
    }
