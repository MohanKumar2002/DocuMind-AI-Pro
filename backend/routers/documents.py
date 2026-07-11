"""
Document pipeline: Upload → Extract → Chunk → Embed → Index
Supports: PDF, DOCX, TXT, CSV, XLSX — with OCR for scanned PDFs
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from pathlib import Path
import uuid, os, logging, asyncio
import pandas as pd

from database import supabase, get_collection
from routers.auth import get_current_user
from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

ALLOWED = {".pdf", ".docx", ".doc", ".txt", ".md", ".csv", ".xlsx", ".xls"}

# ── Text Extractors ──
async def extract_pdf(path: str) -> tuple[str, int]:
    import fitz  # PyMuPDF
    doc = fitz.open(path)
    text = ""
    for page in doc:
        text += page.get_text()
    # OCR fallback for scanned PDFs (only if text is very short — likely a scanned image PDF)
    if len(text.strip()) < 100:
        try:
            import pytesseract
            from PIL import Image
            for page in doc:
                pix = page.get_pixmap(dpi=200)
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                text += pytesseract.image_to_string(img)
        except ImportError:
            logger.warning("pytesseract not installed — skipping OCR for scanned PDF. Install with: pip install pytesseract")
    # Sanitize text: remove characters that cause Windows charmap encoding issues
    text = text.encode("utf-8", errors="replace").decode("utf-8")
    return text, len(doc)

async def extract_docx(path: str) -> tuple[str, int]:
    from docx import Document
    doc = Document(path)
    text = "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
    pages = max(1, len(text) // 3000)
    return text, pages

async def extract_csv_excel(path: str) -> tuple[str, int, dict]:
    ext = Path(path).suffix.lower()
    if ext == ".csv":
        df_dict = {"Sheet1": pd.read_csv(path)}
    else:
        xl = pd.ExcelFile(path)
        df_dict = {name: xl.parse(name) for name in xl.sheet_names}
    # Convert to text for embedding
    all_text = ""
    sheets_data = {}
    for name, df in df_dict.items():
        df = df.fillna("")
        text_repr = f"Sheet: {name}\n" + df.to_string(index=False)
        all_text += text_repr + "\n\n"
        sheets_data[name] = {
            "columns": list(df.columns),
            "rows": len(df),
            "data": df.head(200).to_dict(orient="records"),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()}
        }
    return all_text, 1, sheets_data

async def extract_text_file(path: str) -> tuple[str, int]:
    with open(path, "r", encoding="utf-8", errors="replace") as f:
        text = f.read()
    return text, max(1, len(text) // 3000)

# ── Chunker ──
def chunk_text(text: str, chunk_size: int = 800, overlap: int = 100) -> list[dict]:
    sentences = [s.strip() for s in text.replace("\n\n", ". ").split(". ") if s.strip()]
    chunks = []
    current = ""
    idx = 0
    for sentence in sentences:
        if len(current) + len(sentence) > chunk_size and current:
            chunks.append({"id": idx, "text": current.strip()})
            idx += 1
            words = current.split()
            current = " ".join(words[-overlap//6:]) + " " + sentence + ". "
        else:
            current += sentence + ". "
    if current.strip():
        chunks.append({"id": idx, "text": current.strip()})
    return chunks

# ── Pipeline ──
async def run_pipeline(file_path: str, doc_id: str, user_id: str, file_type: str):
    try:
        supabase.table("documents").update({"status": "processing"}).eq("id", doc_id).execute()
        ext = Path(file_path).suffix.lower()
        sheets_data = None

        # Extract
        if ext == ".pdf":
            text, pages = await extract_pdf(file_path)
        elif ext in (".docx", ".doc"):
            text, pages = await extract_docx(file_path)
        elif ext in (".csv", ".xlsx", ".xls"):
            text, pages, sheets_data = await extract_csv_excel(file_path)
        else:
            text, pages = await extract_text_file(file_path)

        # Chunk
        chunks = chunk_text(text)

        # Embed + Index into ChromaDB
        # ChromaDB enforces max 63-char collection names — use short prefix + doc_id (40 chars total)
        collection_id = f"doc_{doc_id}"
        collection = get_collection(collection_id)

        # Add in batches of 50
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i+batch_size]
            collection.add(
                ids=[f"{doc_id}_chunk_{c['id']}" for c in batch],
                documents=[c["text"] for c in batch],
                metadatas=[{"doc_id": doc_id, "chunk_id": c["id"]} for c in batch]
            )

        # Update document record
        metadata = {"sheets": sheets_data} if sheets_data else {}
        supabase.table("documents").update({
            "status": "ready",
            "pages": pages,
            "chunk_count": len(chunks),
            "collection_id": collection_id,
            "metadata": metadata
        }).eq("id", doc_id).execute()

        logger.info(f"Pipeline complete: doc={doc_id}, chunks={len(chunks)}, pages={pages}")

    except Exception as e:
        err_msg = str(e).encode("ascii", errors="replace").decode("ascii")
        logger.error(f"Pipeline error for doc {doc_id}: {err_msg}")
        supabase.table("documents").update({"status": "error"}).eq("id", doc_id).execute()

# ── Routes ──
@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(get_current_user)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED:
        raise HTTPException(400, f"File type {ext} not supported")

    # Check plan limits
    plan_limit = settings.PLAN_LIMITS[user["plan"]]["docs"]
    if user["docs_used"] >= plan_limit:
        raise HTTPException(402, f"Document limit reached. Upgrade your plan.")

    file_size = 0
    doc_id = str(uuid.uuid4())
    upload_dir = Path(settings.UPLOAD_DIR) / str(user["id"])
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = str(upload_dir / f"{doc_id}{ext}")

    # Save file
    content = await file.read()
    file_size = len(content)
    if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(413, f"File too large. Max {settings.MAX_FILE_SIZE_MB}MB")

    with open(file_path, "wb") as f:
        f.write(content)

    # Create DB record
    supabase.table("documents").insert({
        "id": doc_id,
        "user_id": user["id"],
        "name": file.filename,
        "file_type": ext,
        "file_size": file_size,
        "collection_id": f"doc_{doc_id}",
        "status": "processing"
    }).execute()

    # Increment usage
    supabase.table("profiles").update({
        "docs_used": user["docs_used"] + 1
    }).eq("id", user["id"]).execute()

    # Run pipeline in background
    background_tasks.add_task(run_pipeline, file_path, doc_id, user["id"], ext)

    return {"doc_id": doc_id, "name": file.filename, "status": "processing"}

@router.get("/")
async def list_documents(user=Depends(get_current_user)):
    result = supabase.table("documents").select("*")\
        .eq("user_id", user["id"])\
        .order("created_at", desc=True)\
        .execute()
    return result.data

@router.get("/{doc_id}")
async def get_document(doc_id: str, user=Depends(get_current_user)):
    result = supabase.table("documents").select("*")\
        .eq("id", doc_id).eq("user_id", user["id"]).single().execute()
    if not result.data:
        raise HTTPException(404, "Document not found")
    return result.data

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user=Depends(get_current_user)):
    doc = supabase.table("documents").select("*")\
        .eq("id", doc_id).eq("user_id", user["id"]).single().execute()
    if not doc.data:
        raise HTTPException(404, "Document not found")

    # Delete from ChromaDB
    try:
        collection = get_collection(doc.data["collection_id"])
        collection.delete(where={"doc_id": doc_id})
    except Exception as e:
        logger.warning(f"ChromaDB delete warning: {e}")

    supabase.table("documents").delete().eq("id", doc_id).execute()
    return {"message": "Document deleted"}
