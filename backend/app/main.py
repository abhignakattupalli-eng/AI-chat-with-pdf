import os
import uuid
import shutil
from pathlib import Path
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from .config import UPLOAD_DIR, DEFAULT_MODEL, get_gemini_api_key
from .database import (
    init_db,
    create_document,
    get_all_documents,
    get_document_by_id,
    delete_document as db_delete_document,
    create_session,
    get_all_sessions,
    get_session,
    delete_session as db_delete_session,
    add_message,
    get_messages_for_session,
    clear_session_messages,
    update_session_title
)
from .pdf_processor import extract_and_process_pdf
from .vector_store import vector_store
from .rag_engine import generate_rag_answer, generate_summary

try:
    from google import genai
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

# Initialize database
init_db()

app = FastAPI(
    title="AI Chat With PDF API",
    description="Intelligent Document Assistant with RAG and LLM Support",
    version="1.0.0"
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Request Models ---

class ChatRequest(BaseModel):
    session_id: str
    message: str
    doc_id: Optional[str] = "all"
    top_k: Optional[int] = 4
    api_key: Optional[str] = None
    model: Optional[str] = DEFAULT_MODEL

class SummarizeRequest(BaseModel):
    doc_id: Optional[str] = "all"
    summary_type: Optional[str] = "comprehensive"  # comprehensive, takeaways, faq, eli5
    api_key: Optional[str] = None
    model: Optional[str] = DEFAULT_MODEL

class CreateSessionRequest(BaseModel):
    title: Optional[str] = "New Chat Session"

class KeyTestRequest(BaseModel):
    api_key: str

# --- Document Endpoints ---

@app.post("/api/documents/upload")
async def upload_documents(
    files: List[UploadFile] = File(...),
    x_gemini_key: Optional[str] = Header(None)
):
    """Uploads and indexes one or multiple PDF files."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided.")

    uploaded_results = []
    api_key = get_gemini_api_key(x_gemini_key)

    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            continue

        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}_{Path(file.filename).name}"
        file_path = UPLOAD_DIR / safe_filename

        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        file_size = os.path.getsize(file_path)

        try:
            # Process PDF: extract pages and chunk text
            page_count, chunks = extract_and_process_pdf(
                pdf_path=file_path,
                doc_id=doc_id,
                filename=file.filename
            )

            # Index chunks in vector store
            vector_store.add_chunks(chunks, api_key=api_key)

            # Save metadata to database
            doc_record = create_document(
                doc_id=doc_id,
                filename=safe_filename,
                original_filename=file.filename,
                file_size=file_size,
                page_count=page_count,
                chunk_count=len(chunks),
                status="indexed"
            )
            uploaded_results.append(doc_record)
        except Exception as e:
            # Clean up on failure
            if file_path.exists():
                file_path.unlink()
            print(f"Error processing {file.filename}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to process {file.filename}: {str(e)}")

    return {
        "message": f"Successfully processed {len(uploaded_results)} PDF(s).",
        "documents": uploaded_results
    }

@app.get("/api/documents")
def list_documents():
    """Lists all uploaded documents."""
    docs = get_all_documents()
    return {"documents": docs, "total_chunks": vector_store.count()}

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: str):
    """Deletes a document, its physical file, and vector chunks."""
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    # Remove file from disk
    file_path = UPLOAD_DIR / doc["filename"]
    if file_path.exists():
        file_path.unlink()

    # Remove from vector store
    removed_chunks = vector_store.delete_document(doc_id)

    # Remove from database
    db_delete_document(doc_id)

    return {
        "message": f"Document '{doc['original_filename']}' deleted successfully.",
        "removed_chunks": removed_chunks
    }

@app.get("/api/documents/{doc_id}/chunks")
def get_document_chunks(doc_id: str):
    """Inspects text chunks for a specific document."""
    chunks = vector_store.get_chunks_by_document(doc_id)
    return {"doc_id": doc_id, "chunk_count": len(chunks), "chunks": chunks}

@app.post("/api/documents/load-samples")
def load_sample_documents_endpoint(x_gemini_key: Optional[str] = Header(None)):
    """Loads and indexes the pre-generated sample PDF documents."""
    sample_dir = Path(__file__).resolve().parent.parent / "sample_docs"
    if not sample_dir.exists():
        raise HTTPException(status_code=404, detail="Sample documents directory not found.")

    sample_files = list(sample_dir.glob("*.pdf"))
    if not sample_files:
        raise HTTPException(status_code=404, detail="No sample PDFs found.")

    api_key = get_gemini_api_key(x_gemini_key)
    loaded_docs = []

    for file_path in sample_files:
        # Check if already loaded by original filename
        existing = [d for d in get_all_documents() if d["original_filename"] == file_path.name]
        if existing:
            loaded_docs.append(existing[0])
            continue

        doc_id = str(uuid.uuid4())
        safe_filename = f"{doc_id}_{file_path.name}"
        dest_path = UPLOAD_DIR / safe_filename
        shutil.copyfile(file_path, dest_path)
        file_size = os.path.getsize(dest_path)

        page_count, chunks = extract_and_process_pdf(
            pdf_path=dest_path,
            doc_id=doc_id,
            filename=file_path.name
        )
        vector_store.add_chunks(chunks, api_key=api_key)
        doc_record = create_document(
            doc_id=doc_id,
            filename=safe_filename,
            original_filename=file_path.name,
            file_size=file_size,
            page_count=page_count,
            chunk_count=len(chunks),
            status="indexed"
        )
        loaded_docs.append(doc_record)

    return {
        "message": f"Successfully loaded {len(loaded_docs)} sample document(s).",
        "documents": loaded_docs
    }

# --- Session Endpoints ---

@app.post("/api/sessions")
def create_new_session(req: CreateSessionRequest):
    """Creates a new chat session."""
    session = create_session(req.title or "New Chat Session")
    return session

@app.get("/api/sessions")
def list_sessions():
    """Lists all chat sessions."""
    return {"sessions": get_all_sessions()}

@app.get("/api/sessions/{session_id}")
def get_session_details(session_id: str):
    """Returns session details and its message history."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")
    messages = get_messages_for_session(session_id)
    return {"session": session, "messages": messages}

@app.delete("/api/sessions/{session_id}")
def delete_session_endpoint(session_id: str):
    """Deletes a session and its messages."""
    deleted = db_delete_session(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found.")
    return {"message": "Session deleted."}

@app.delete("/api/sessions/{session_id}/messages")
def clear_messages_endpoint(session_id: str):
    """Clears all messages from a session while keeping the session."""
    clear_session_messages(session_id)
    return {"message": "Session chat history cleared."}

# --- Chat & RAG Endpoints ---

@app.post("/api/chat")
def chat_with_pdf(
    req: ChatRequest,
    x_gemini_key: Optional[str] = Header(None)
):
    """
    Main RAG Chat endpoint:
    - Accepts user question and target document(s)
    - Retrieves relevant context
    - Generates context-aware answer
    - Stores message and sources in session history
    """
    session = get_session(req.session_id)
    if not session:
        # Create session automatically if missing
        session = create_session("Document Chat")
        req.session_id = session["id"]

    # Retrieve session history
    existing_messages = get_messages_for_session(req.session_id)

    # Save user message to database
    add_message(
        session_id=req.session_id,
        role="user",
        content=req.message
    )

    # Update session title if it's the first message
    if len(existing_messages) == 0:
        first_title = req.message[:35] + ("..." if len(req.message) > 35 else "")
        update_session_title(req.session_id, first_title)

    # Effective API key
    effective_api_key = req.api_key or x_gemini_key or get_gemini_api_key()

    # Generate RAG response
    rag_result = generate_rag_answer(
        query=req.message,
        chat_history=existing_messages,
        doc_id=req.doc_id,
        top_k=req.top_k or 4,
        api_key_override=effective_api_key,
        model_name=req.model or DEFAULT_MODEL
    )

    # Save assistant message to database with source citations
    assistant_msg = add_message(
        session_id=req.session_id,
        role="assistant",
        content=rag_result["answer"],
        sources=rag_result.get("sources", [])
    )

    return {
        "message": assistant_msg,
        "model_used": rag_result.get("model_used"),
        "sources": rag_result.get("sources", [])
    }

# --- Summarization Endpoint ---

@app.post("/api/summarize")
def summarize_document(
    req: SummarizeRequest,
    x_gemini_key: Optional[str] = Header(None)
):
    """Generates an executive summary or quick-action extraction from document(s)."""
    effective_api_key = req.api_key or x_gemini_key or get_gemini_api_key()
    result = generate_summary(
        doc_id=req.doc_id,
        api_key_override=effective_api_key,
        model_name=req.model or DEFAULT_MODEL,
        summary_type=req.summary_type or "comprehensive"
    )
    return result

# --- Status & Settings Endpoints ---

@app.get("/api/status")
def get_system_status():
    """Returns application status and configurations."""
    docs = get_all_documents()
    env_key_set = bool(os.getenv("GEMINI_API_KEY", "").strip())
    return {
        "status": "online",
        "documents_count": len(docs),
        "total_chunks": vector_store.count(),
        "has_env_gemini_key": env_key_set,
        "default_model": DEFAULT_MODEL,
        "genai_sdk_available": GENAI_AVAILABLE
    }

@app.post("/api/test-key")
def test_gemini_key(req: KeyTestRequest):
    """Validates a Gemini API Key."""
    if not req.api_key or not req.api_key.strip():
        raise HTTPException(status_code=400, detail="API key is empty.")

    if not GENAI_AVAILABLE:
        return {"valid": False, "error": "Google GenAI SDK is not available."}

    try:
        client = genai.Client(api_key=req.api_key.strip())
        resp = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents="Say 'API Key is valid!' in 5 words or less."
        )
        return {
            "valid": True,
            "message": "API Key is valid and verified with Gemini!",
            "test_response": resp.text
        }
    except Exception as e:
        return {
            "valid": False,
            "error": str(e)
        }

# Mount static frontend if built
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        file_path = FRONTEND_DIST / full_path
        if file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(FRONTEND_DIST / "index.html")

