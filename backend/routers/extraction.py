from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
import json
from database import supabase, get_collection
from routers.auth import get_current_user
from config import settings
import logging

logger = logging.getLogger(__name__)
router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

class ExtractionRequest(BaseModel):
    doc_id: str
    fields: list[str]  # e.g. ["Vendor Name", "Invoice Date", "Total Amount"]
    language: str = "en"

@router.post("/")
async def extract_data(body: ExtractionRequest, user=Depends(get_current_user)):
    doc_res = supabase.table("documents").select("*")\
        .eq("id", body.doc_id).eq("user_id", user["id"]).single().execute()
    
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
        
    doc = doc_res.data
    if doc["status"] != "ready":
        raise HTTPException(400, "Document still processing")

    # For CSV/Excel, use the metadata sheets representation
    text_sample = ""
    if doc["file_type"] in (".csv", ".xlsx", ".xls"):
        sheets = doc.get("metadata", {}).get("sheets", {})
        text_sample = json.dumps(sheets, default=str)[:12000]
    else:
        # Get chunks from ChromaDB
        collection = get_collection(doc["collection_id"])
        all_chunks = collection.get(where={"doc_id": body.doc_id})
        text_sample = "\n\n".join(all_chunks["documents"][:30]) if all_chunks["documents"] else ""

    if not text_sample:
        raise HTTPException(400, "No content found in document to extract")

    lang_map = {"ta": "Tamil", "hi": "Hindi", "te": "Telugu", "en": "English"}
    lang = lang_map.get(body.language, "English")
    
    fields_str = ", ".join([f'"{f}"' for f in body.fields])
    
    prompt = f"""You are an expert data extractor. Extract the following fields from the document text: {fields_str}.
Respond ONLY with a valid JSON object where the keys are exactly the requested fields. If a field cannot be found, use null as the value.
Translate extracted values into {lang} if they are not numbers or proper nouns.

Document content:
{text_sample[:12000]}
"""

    try:
        response = groq_client.chat.completions.create(
            model=settings.GROQ_MODEL,  # Use 70B for better accuracy on JSON extraction
            messages=[{
                "role": "system",
                "content": "You are a helpful assistant that outputs only JSON."
            }, {
                "role": "user",
                "content": prompt
            }],
            response_format={"type": "json_object"},
            max_tokens=2000,
            temperature=0.1
        )
        
        content = response.choices[0].message.content
        extracted_json = json.loads(content)
        
        return {
            "extracted_data": extracted_json,
            "fields_requested": body.fields,
            "language": body.language
        }
    except Exception as e:
        logger.error(f"Extraction error: {e}")
        raise HTTPException(500, "Failed to extract data.")
