from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import supabase
from routers.auth import get_current_user
from config import settings
import hmac, hashlib, json, logging

logger = logging.getLogger(__name__)
router = APIRouter()

PLAN_PRICES = {
    "student":  {"inr": 29900,  "label": "Student Plan"},
    "pro":      {"inr": 99900,  "label": "Professional Plan"},
    "business": {"inr": 499900, "label": "Business Plan"},
}

class CreateOrderRequest(BaseModel):
    plan: str

@router.post("/create-order")
async def create_order(body: CreateOrderRequest, user=Depends(get_current_user)):
    if body.plan not in PLAN_PRICES:
        raise HTTPException(400, "Invalid plan")
    if not settings.RAZORPAY_KEY_ID:
        raise HTTPException(503, "Payment gateway not configured")

    import razorpay
    client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
    plan_info = PLAN_PRICES[body.plan]

    order = client.order.create({
        "amount": plan_info["inr"],
        "currency": "INR",
        "receipt": f"order_{user['id'][:8]}",
        "notes": {"user_id": user["id"], "plan": body.plan}
    })

    supabase.table("payments").insert({
        "user_id": user["id"],
        "razorpay_order_id": order["id"],
        "amount": plan_info["inr"],
        "plan": body.plan,
        "status": "pending"
    }).execute()

    return {
        "order_id": order["id"],
        "amount": plan_info["inr"],
        "currency": "INR",
        "key": settings.RAZORPAY_KEY_ID,
        "plan": body.plan,
        "description": plan_info["label"]
    }

@router.post("/verify")
async def verify_payment(request: Request, user=Depends(get_current_user)):
    body = await request.json()
    order_id = body.get("razorpay_order_id")
    payment_id = body.get("razorpay_payment_id")
    signature = body.get("razorpay_signature")
    plan = body.get("plan")

    # Verify signature
    msg = f"{order_id}|{payment_id}"
    expected = hmac.new(settings.RAZORPAY_KEY_SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(400, "Invalid payment signature")

    # Update DB
    supabase.table("payments").update({
        "razorpay_payment_id": payment_id,
        "status": "success"
    }).eq("razorpay_order_id", order_id).execute()

    # Upgrade user plan
    supabase.table("profiles").update({
        "plan": plan,
        "docs_used": 0,
        "questions_used": 0,
        "subscription_status": "active"
    }).eq("id", user["id"]).execute()

    return {"success": True, "plan": plan, "message": f"Successfully upgraded to {plan} plan!"}

@router.get("/plans")
async def get_plans():
    return {
        "plans": [
            {"id": "free", "name": "Free", "price_inr": 0, "price_usd": 0, "docs": 3, "questions": 20},
            {"id": "student", "name": "Student", "price_inr": 299, "price_usd": 4, "docs": 50, "questions": 500},
            {"id": "pro", "name": "Professional", "price_inr": 999, "price_usd": 12, "docs": 200, "questions": 5000},
            {"id": "business", "name": "Business", "price_inr": 4999, "price_usd": 60, "docs": 999999, "questions": 999999},
        ]
    }
