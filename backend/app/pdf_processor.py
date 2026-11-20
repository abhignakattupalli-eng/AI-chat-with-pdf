import re
import uuid
from pathlib import Path
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
from .config import DEFAULT_CHUNK_SIZE, DEFAULT_CHUNK_OVERLAP

def clean_text(text: str) -> str:
    """Normalize whitespace and remove non-printable characters."""
    if not text:
        return ""
    # Replace multiple spaces/newlines with clean formatting
    text = re.sub(r'[\r\t]+', ' ', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    text = re.sub(r'[ ]{2,}', ' ', text)
    return text.strip()

def extract_text_by_pages(pdf_path: Path) -> List[Dict[str, Any]]:
    """
    Extracts text from each page of a PDF document using PyPDF.
    Returns list of dicts: [{"page_number": int, "text": str}]
    """
    reader = PdfReader(str(pdf_path))
    pages_data = []

    for idx, page in enumerate(reader.pages):
        page_num = idx + 1
        try:
            page_text = page.extract_text() or ""
        except Exception as e:
            print(f"Warning extracting text from page {page_num}: {e}")
            page_text = ""
        
        cleaned = clean_text(page_text)
        if cleaned:
            pages_data.append({
                "page_number": page_num,
                "text": cleaned
            })
            
    return pages_data

def chunk_text(
    pages_data: List[Dict[str, Any]],
    doc_id: str,
    filename: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> List[Dict[str, Any]]:
    """
    Splits page text into smaller chunks while preserving page numbers and source metadata.
    Uses sliding window with sentence/paragraph boundary awareness.
    """
    chunks = []
    chunk_global_idx = 0

    for p in pages_data:
        page_num = p["page_number"]
        page_text = p["text"]

        if len(page_text) <= chunk_size:
            chunk_global_idx += 1
            chunks.append({
                "chunk_id": f"{doc_id}_c{chunk_global_idx}",
                "doc_id": doc_id,
                "filename": filename,
                "page_number": page_num,
                "chunk_index": chunk_global_idx,
                "text": page_text
            })
            continue

        # Split by paragraph or sentence
        # Paragraphs first
        paragraphs = [para.strip() for para in page_text.split("\n\n") if para.strip()]
        
        current_chunk = ""
        for para in paragraphs:
            if not current_chunk:
                current_chunk = para
            elif len(current_chunk) + len(para) + 2 <= chunk_size:
                current_chunk += "\n\n" + para
            else:
                # If current_chunk is big enough, record it
                if current_chunk:
                    chunk_global_idx += 1
                    chunks.append({
                        "chunk_id": f"{doc_id}_c{chunk_global_idx}",
                        "doc_id": doc_id,
                        "filename": filename,
                        "page_number": page_num,
                        "chunk_index": chunk_global_idx,
                        "text": current_chunk
                    })
                    # Keep overlap
                    overlap_len = min(len(current_chunk), chunk_overlap)
                    overlap_seed = current_chunk[-overlap_len:]
                    current_chunk = overlap_seed + " " + para
                else:
                    current_chunk = para

            # If a single paragraph is larger than chunk_size, split by sentences
            while len(current_chunk) > chunk_size:
                split_point = current_chunk.rfind(". ", 0, chunk_size)
                if split_point == -1:
                    split_point = current_chunk.rfind(" ", 0, chunk_size)
                if split_point == -1 or split_point < chunk_size // 3:
                    split_point = chunk_size

                chunk_text_slice = current_chunk[:split_point].strip()
                chunk_global_idx += 1
                chunks.append({
                    "chunk_id": f"{doc_id}_c{chunk_global_idx}",
                    "doc_id": doc_id,
                    "filename": filename,
                    "page_number": page_num,
                    "chunk_index": chunk_global_idx,
                    "text": chunk_text_slice
                })
                # Advance with overlap
                start_next = max(0, split_point - chunk_overlap)
                current_chunk = current_chunk[start_next:].strip()

        if current_chunk and len(current_chunk) > 30:
            chunk_global_idx += 1
            chunks.append({
                "chunk_id": f"{doc_id}_c{chunk_global_idx}",
                "doc_id": doc_id,
                "filename": filename,
                "page_number": page_num,
                "chunk_index": chunk_global_idx,
                "text": current_chunk
            })

    return chunks

def extract_and_process_pdf(
    pdf_path: Path,
    doc_id: str,
    filename: str,
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP
) -> Tuple[int, List[Dict[str, Any]]]:
    """
    Full pipeline: reads PDF, extracts pages, chunks text.
    Returns (page_count, chunks_list).
    """
    reader = PdfReader(str(pdf_path))
    page_count = len(reader.pages)
    pages_data = extract_text_by_pages(pdf_path)
    chunks = chunk_text(pages_data, doc_id, filename, chunk_size, chunk_overlap)
    return page_count, chunks
