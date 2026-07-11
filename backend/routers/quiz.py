from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from groq import Groq
from database import supabase, get_collection
from routers.auth import get_current_user
from config import settings
import json, re

router = APIRouter()
groq_client = Groq(api_key=settings.GROQ_API_KEY)

class QuizRequest(BaseModel):
    doc_id: str
    count: int = 10
    type: str = "mcq"  # mcq, truefalse, mixed
    difficulty: str = "medium"  # easy, medium, hard
    language: str = "en"

@router.post("/generate")
async def generate_quiz(body: QuizRequest, user=Depends(get_current_user)):
    doc_res = supabase.table("documents").select("*")\
        .eq("id", body.doc_id).eq("user_id", user["id"]).single().execute()
    if not doc_res.data:
        raise HTTPException(404, "Document not found")
    doc = doc_res.data
    if doc["status"] != "ready":
        raise HTTPException(400, "Document still processing")

    collection = get_collection(doc["collection_id"])
    all_chunks = collection.get(where={"doc_id": body.doc_id})
    content = "\n\n".join(all_chunks["documents"][:20]) if all_chunks["documents"] else ""

    type_instructions = {
        "mcq": "multiple choice questions with 4 options (A, B, C, D). Mark the correct answer index (0-3).",
        "truefalse": "true/false questions. Use options ['True', 'False']. Answer index is 0 for True, 1 for False.",
        "mixed": "a mix of multiple choice (70%) and true/false (30%) questions."
    }

    lang_map = {"ta": "Tamil", "hi": "Hindi", "te": "Telugu", "en": "English"}
    lang = lang_map.get(body.language, "English")

    prompt = f"""Generate exactly {body.count} {type_instructions[body.type]} based on this document.
Difficulty: {body.difficulty}
Language: {lang}

Return ONLY a JSON array with this exact structure (no markdown, no preamble):
[
  {{
    "q": "Question text",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": 0,
    "explanation": "Why this answer is correct, citing the document",
    "difficulty": "{body.difficulty}"
  }}
]

Document content:
{content[:10000]}"""

    response = groq_client.chat.completions.create(
        model=settings.GROQ_MODEL_FAST,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=3000,
        temperature=0.4
    )

    raw = response.choices[0].message.content.strip()
    # Clean JSON
    raw = re.sub(r"```json|```", "", raw).strip()
    try:
        questions = json.loads(raw)
    except json.JSONDecodeError:
        # Try to extract JSON array
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            questions = json.loads(match.group())
        else:
            raise HTTPException(500, "Failed to parse quiz questions")

    # Save to DB
    quiz_id = supabase.table("quizzes").insert({
        "user_id": user["id"],
        "document_id": body.doc_id,
        "questions": questions
    }).execute().data[0]["id"]

    return {
        "quiz_id": quiz_id,
        "questions": questions,
        "count": len(questions),
        "doc_name": doc["name"]
    }

@router.post("/submit/{quiz_id}")
async def submit_quiz(quiz_id: str, answers: list[int], user=Depends(get_current_user)):
    quiz_res = supabase.table("quizzes").select("*")\
        .eq("id", quiz_id).eq("user_id", user["id"]).single().execute()
    if not quiz_res.data:
        raise HTTPException(404, "Quiz not found")

    questions = quiz_res.data["questions"]
    correct = sum(1 for i, q in enumerate(questions) if i < len(answers) and answers[i] == q["answer"])
    score = round((correct / len(questions)) * 100)

    supabase.table("quizzes").update({
        "score": score,
        "completed_at": "NOW()"
    }).eq("id", quiz_id).execute()

    return {
        "score": score,
        "correct": correct,
        "total": len(questions),
        "results": [{"correct": answers[i] == q["answer"], "explanation": q["explanation"]}
                    for i, q in enumerate(questions) if i < len(answers)]
    }
