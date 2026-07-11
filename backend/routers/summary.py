from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
from database import supabase, get_collection
from routers.auth import get_current_user
from config import settings

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

LEVEL_PROMPTS = {
    "quick": "Summarize this document in exactly 2-3 sentences. Be extremely concise.",
    "detailed": """Write a detailed summary with:
- **Overview**: What this document is about (2-3 sentences)
- **Key Points**: 5-7 most important points as bullet points
- **Important Data**: Any key numbers, dates, or statistics
- **Conclusion**: Main takeaway""",
    "full": """Write a comprehensive breakdown:
- **Document Overview**
- **Section-by-Section Analysis** (cover all major topics)
- **Key Facts & Statistics**
- **Important Names, Dates & Entities**
- **Conclusions & Recommendations**
- **Action Items** (if any)"""
}

class SummaryRequest(BaseModel):
    doc_id: str
    level: str = "detailed"
    language: str = "en"

@router.post("/")
async def generate_summary(body: SummaryRequest, user=Depends(get_current_user)):
    doc_res = supabase.table("documents").select("*")\
        .eq("id", body.doc_id).eq("user_id", user["id"]).single().execute()
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    doc = doc_res.data
    if doc["status"] != "ready":
        raise HTTPException(400, "Document still processing")

    # Get top chunks
    collection = get_collection(doc["collection_id"])
    all_chunks = collection.get(where={"doc_id": body.doc_id})
    text_sample = "\n\n".join(all_chunks["documents"][:30]) if all_chunks["documents"] else ""

    lang_map = {"ta": "Tamil (தமிழ்)", "hi": "Hindi (हिन्दी)", "te": "Telugu (తెలుగు)", "en": "English"}
    lang = lang_map.get(body.language, "English")
    level_prompt = LEVEL_PROMPTS.get(body.level, LEVEL_PROMPTS["detailed"])

    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL_FAST,
        messages=[{
            "role": "user",
            "content": f"{level_prompt}\n\nRespond in {lang}.\n\nDocument content:\n{text_sample[:12000]}"
        }],
        max_tokens=2000,
        temperature=0.2
    )
    return {
        "summary": response.choices[0].message.content,
        "level": body.level,
        "language": body.language,
        "tokens_used": response.usage.total_tokens
    }
