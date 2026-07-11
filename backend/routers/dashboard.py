from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
from database import supabase
from routers.auth import get_current_user
from config import settings
import json

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

class DashboardAskRequest(BaseModel):
    doc_id: str
    question: str
    language: str = "en"

@router.get("/{doc_id}")
async def get_dashboard_data(doc_id: str, user=Depends(get_current_user)):
    doc_res = supabase.table("documents").select("*")\
        .eq("id", doc_id).eq("user_id", user["id"]).single().execute()
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    doc = doc_res.data
    if doc["file_type"] not in (".csv", ".xlsx", ".xls"):
        raise HTTPException(400, "Dashboard only available for CSV/Excel files")
    return {
        "doc_id": doc_id,
        "name": doc["name"],
        "sheets": doc.get("metadata", {}).get("sheets", {})
    }

@router.post("/ask")
async def ask_dashboard(body: DashboardAskRequest, user=Depends(get_current_user)):
    doc_res = supabase.table("documents").select("*")\
        .eq("id", body.doc_id).eq("user_id", user["id"]).single().execute()
    if not doc_res.data:
        raise HTTPException(404, "Document not found")

    sheets = doc_res.data.get("metadata", {}).get("sheets", {})
    data_summary = json.dumps(sheets, default=str)[:8000]
    lang_map = {"ta": "Tamil", "hi": "Hindi", "te": "Telugu", "en": "English"}
    lang = lang_map.get(body.language, "English")

    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL_FAST,
        messages=[{
            "role": "user",
            "content": f"""Answer this question about the spreadsheet data: {body.question}

Respond in {lang}. Be specific with numbers and column names. Format with bullet points.

Data summary:
{data_summary}"""
        }],
        max_tokens=800,
        temperature=0.2
    )
    return {"answer": response.choices[0].message.content}
