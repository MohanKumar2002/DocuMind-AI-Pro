"""
Chat router — RAG pipeline:
1. Retrieve relevant chunks from ChromaDB (HuggingFace embeddings)
2. Build context-aware prompt
3. Generate answer via Groq (Llama 3.1 70B) — free, ultra-fast
4. Support multilingual: Tamil, Hindi, Telugu, German
5. Stream response back to frontend
"""
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq
from database import supabase, get_collection
from routers.auth import get_current_user
from config import settings
import logging, json

logger = logging.getLogger(__name__)
router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

LANGUAGE_INSTRUCTIONS = {
    "en": "Respond in English.",
    "ta": "Please respond entirely in Tamil (தமிழ்). Even if the document is in English, your answer must be in Tamil.",
    "hi": "Please respond entirely in Hindi (हिन्दी). Even if the document is in English, your answer must be in Hindi.",
    "te": "Please respond entirely in Telugu (తెలుగు). Even if the document is in English, your answer must be in Telugu.",
    "de": "Please respond entirely in German (Deutsch).",
    "fr": "Please respond entirely in French (Français).",
}

class ChatRequest(BaseModel):
    doc_id: str
    message: str
    language: str = "en"
    stream: bool = True

class ChatResponse(BaseModel):
    answer: str
    sources: list[dict]
    chunks_used: int
    tokens_used: int

@router.post("/")
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    # Check plan limits
    plan_limit = settings.PLAN_LIMITS[user["plan"]]["questions"]
    if user["questions_used"] >= plan_limit:
        raise HTTPException(402, "Question limit reached. Please upgrade your plan.")

    # Get document
    doc_res = supabase.table("documents").select("*")\
        .eq("id", body.doc_id).eq("user_id", user["id"]).single().execute()
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    doc = doc_res.data
    if doc["status"] != "ready":
        raise HTTPException(400, "Document is still processing. Please wait.")

    # Retrieve relevant chunks from ChromaDB
    try:
        collection = get_collection(doc["collection_id"])
        results = collection.query(
            query_texts=[body.message],
            n_results=min(5, doc["chunk_count"])
        )
        chunks = results["documents"][0] if results["documents"] else []
        distances = results["distances"][0] if results["distances"] else []
    except Exception as e:
        logger.error(f"ChromaDB query error: {e}")
        raise HTTPException(500, "Error searching document")

    if not chunks:
        return {"answer": "I couldn't find relevant information in this document.", "sources": [], "chunks_used": 0, "tokens_used": 0}

    # Build context
    context = "\n\n---\n\n".join([f"[Section {i+1}]: {chunk}" for i, chunk in enumerate(chunks)])
    lang_instruction = LANGUAGE_INSTRUCTIONS.get(body.language, LANGUAGE_INSTRUCTIONS["en"])

    # Get recent chat history (last 4 messages)
    history_res = supabase.table("chat_messages").select("role,content")\
        .eq("doc_id", body.doc_id).eq("user_id", user["id"])\
        .order("created_at", desc=True).limit(8).execute()
    history = list(reversed(history_res.data)) if history_res.data else []

    # Build messages
    system_prompt = f"""You are DocuMind AI, an expert document analysis assistant built by MOH AI TECH (Namakkal, Tamil Nadu, India).

You have been given relevant sections from the user's document to answer their question.

RULES:
1. Answer ONLY based on the document sections provided below
2. If the answer is not in the document, clearly say "This information is not found in the document"
3. Always cite which section your answer comes from (e.g., "According to Section 2...")
4. Be concise but thorough
5. Use bullet points and bold text for clarity
6. {lang_instruction}

DOCUMENT SECTIONS:
{context}"""

    messages = [{"role": "system", "content": system_prompt}]
    for msg in history[-6:]:
        messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": body.message})

    # Stream response
    if body.stream:
        async def generate():
            full_response = ""
            try:
                stream = groq_client.chat.completions.create(
                    model=settings.GROQ_MODEL,
                    messages=messages,
                    max_tokens=1500,
                    temperature=0.3,
                    stream=True
                )
                for chunk in stream:
                    delta = chunk.choices[0].delta.content or ""
                    full_response += delta
                    yield f"data: {json.dumps({'delta': delta, 'done': False})}\n\n"

                # Save to DB
                supabase.table("chat_messages").insert({
                    "user_id": user["id"],
                    "document_id": body.doc_id,
                    "role": "user",
                    "content": body.message,
                    "language": body.language
                }).execute()
                supabase.table("chat_messages").insert({
                    "user_id": user["id"],
                    "document_id": body.doc_id,
                    "role": "assistant",
                    "content": full_response,
                    "sources": [{"section": i+1, "score": 1-d} for i, d in enumerate(distances)],
                    "language": body.language
                }).execute()

                # Increment usage
                supabase.table("profiles").update({
                    "questions_used": user["questions_used"] + 1
                }).eq("id", user["id"]).execute()

                sources = [{"section": i+1, "preview": c[:120]+"...", "score": round(1-d, 3)}
                          for i, (c, d) in enumerate(zip(chunks, distances))]
                yield f"data: {json.dumps({'delta': '', 'done': True, 'sources': sources, 'chunks_used': len(chunks)})}\n\n"

            except Exception as e:
                logger.error(f"Groq streaming error: {e}")
                yield f"data: {json.dumps({'error': str(e), 'done': True})}\n\n"

        return StreamingResponse(generate(), media_type="text/event-stream",
                                  headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # Non-streaming fallback
    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL,
        messages=messages,
        max_tokens=1500,
        temperature=0.3
    )
    answer = response.choices[0].message.content
    tokens = response.usage.total_tokens
    sources = [{"section": i+1, "preview": c[:120], "score": round(1-d, 3)}
               for i, (c, d) in enumerate(zip(chunks, distances))]

    return {"answer": answer, "sources": sources, "chunks_used": len(chunks), "tokens_used": tokens}

@router.get("/history/{doc_id}")
async def get_history(doc_id: str, user=Depends(get_current_user)):
    result = supabase.table("chat_messages").select("*")\
        .eq("document_id", doc_id).eq("user_id", user["id"])\
        .order("created_at").execute()
    return result.data

@router.delete("/history/{doc_id}")
async def clear_history(doc_id: str, user=Depends(get_current_user)):
    supabase.table("chat_messages").delete()\
        .eq("document_id", doc_id).eq("user_id", user["id"]).execute()
    return {"message": "Chat history cleared"}
