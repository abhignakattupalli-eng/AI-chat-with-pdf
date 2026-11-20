import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional
from .config import DB_PATH

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # Documents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        original_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        chunk_count INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        status TEXT NOT NULL
    )
    """)

    # Chat Sessions table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Chat Messages table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        sources TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions (id) ON DELETE CASCADE
    )
    """)

    conn.commit()
    conn.close()

# --- Documents CRUD ---

def create_document(doc_id: str, filename: str, original_filename: str, file_size: int, page_count: int, chunk_count: int, status: str = "indexed") -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    uploaded_at = datetime.utcnow().isoformat()
    cursor.execute("""
    INSERT INTO documents (id, filename, original_filename, file_size, page_count, chunk_count, uploaded_at, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, filename, original_filename, file_size, page_count, chunk_count, uploaded_at, status))
    conn.commit()
    conn.close()
    return {
        "id": doc_id,
        "filename": filename,
        "original_filename": original_filename,
        "file_size": file_size,
        "page_count": page_count,
        "chunk_count": chunk_count,
        "uploaded_at": uploaded_at,
        "status": status
    }

def get_all_documents() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_document_by_id(doc_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def delete_document(doc_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Sessions CRUD ---

def create_session(title: str = "New Chat Session") -> Dict[str, Any]:
    session_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO sessions (id, title, created_at, updated_at)
    VALUES (?, ?, ?, ?)
    """, (session_id, title, now, now))
    conn.commit()
    conn.close()
    return {
        "id": session_id,
        "title": title,
        "created_at": now,
        "updated_at": now,
        "message_count": 0
    }

def get_all_sessions() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT s.id, s.title, s.created_at, s.updated_at, COUNT(m.id) as message_count
    FROM sessions s
    LEFT JOIN messages m ON s.id = m.session_id
    GROUP BY s.id
    ORDER BY s.updated_at DESC
    """)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def update_session_title(session_id: str, title: str):
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.utcnow().isoformat()
    cursor.execute("UPDATE sessions SET title = ?, updated_at = ? WHERE id = ?", (title, now, session_id))
    conn.commit()
    conn.close()

def delete_session(session_id: str) -> bool:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted

# --- Messages CRUD ---

def add_message(session_id: str, role: str, content: str, sources: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    msg_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    sources_json = json.dumps(sources) if sources else None
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO messages (id, session_id, role, content, sources, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, (msg_id, session_id, role, content, sources_json, now))
    
    # Touch session updated_at
    cursor.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    
    conn.commit()
    conn.close()
    return {
        "id": msg_id,
        "session_id": session_id,
        "role": role,
        "content": content,
        "sources": sources or [],
        "created_at": now
    }

def get_messages_for_session(session_id: str) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC", (session_id,))
    rows = cursor.fetchall()
    conn.close()
    
    results = []
    for r in rows:
        item = dict(r)
        if item.get("sources"):
            try:
                item["sources"] = json.loads(item["sources"])
            except Exception:
                item["sources"] = []
        else:
            item["sources"] = []
        results.append(item)
    return results

def clear_session_messages(session_id: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM messages WHERE session_id = ?", (session_id,))
    now = datetime.utcnow().isoformat()
    cursor.execute("UPDATE sessions SET updated_at = ? WHERE id = ?", (now, session_id))
    conn.commit()
    conn.close()
