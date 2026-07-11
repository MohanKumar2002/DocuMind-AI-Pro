from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from jose import JWTError, jwt
from datetime import datetime, timedelta
from database import supabase, supabase_admin
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
bearer = HTTPBearer()

# ── Schemas ──
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

# ── JWT helpers ──
def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    payload = decode_token(credentials.credentials)
    user_id = payload.get("sub")
    try:
        result = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="User not found")
        return result.data
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not fetch user")

# ── Routes ──
@router.post("/signup", response_model=TokenResponse)
async def signup(body: SignupRequest):
    try:
        # Create Supabase auth user
        res = supabase_admin.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True
        })
        user_id = res.user.id

        # Create profile
        supabase_admin.table("profiles").insert({
            "id": user_id,
            "email": body.email,
            "full_name": body.full_name,
            "plan": "free"
        }).execute()

        token = create_token(user_id, body.email)
        return {
            "access_token": token,
            "user": {
                "id": user_id,
                "email": body.email,
                "full_name": body.full_name,
                "plan": "free"
            }
        }
    except Exception as e:
        logger.error(f"Signup error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest):
    try:
        res = supabase.auth.sign_in_with_password({
            "email": body.email,
            "password": body.password
        })
        user_id = res.user.id

        profile = supabase.table("profiles").select("*").eq("id", user_id).single().execute()
        token = create_token(user_id, body.email)

        return {
            "access_token": token,
            "user": profile.data
        }
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid email or password")

@router.get("/me")
async def get_me(user=Depends(get_current_user)):
    return user

@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
