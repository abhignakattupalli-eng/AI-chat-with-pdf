import os
from typing import List, Dict, Any, Optional, Tuple
from .config import DEFAULT_MODEL, get_gemini_api_key
from .vector_store import vector_store

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

SYSTEM_PROMPT = """You are an Intelligent Document Assistant powered by RAG (Retrieval-Augmented Generation).
Your task is to provide clear, accurate, and context-grounded answers based on the provided document excerpts.

Guidelines:
1. Always base your answers on the provided Document Context whenever possible.
2. When referencing facts, cite the source document and page number in your response using markdown or brackets, e.g., "[Document: filename.pdf, Page: 2]".
3. If the context does not contain enough information to answer completely, acknowledge what is in the documents and clarify what is missing.
4. Use clear formatting, bullet points, headers, or code blocks where appropriate.
5. Remain helpful, polite, and objective.
"""

def build_context_string(chunks: List[Dict[str, Any]]) -> str:
    if not chunks:
        return "No relevant document excerpts found."

    context_parts = []
    for idx, c in enumerate(chunks, 1):
        filename = c.get("filename", "Unknown Document")
        page = c.get("page_number", "Unknown")
        text = c.get("text", "").strip()
        context_parts.append(
            f"--- EXCERPT {idx} (File: {filename}, Page: {page}) ---\n{text}\n"
        )
    return "\n".join(context_parts)

def build_history_string(messages: List[Dict[str, Any]], max_history: int = 6) -> str:
    recent = messages[-max_history:]
    history_lines = []
    for msg in recent:
        role = "User" if msg.get("role") == "user" else "Assistant"
        content = msg.get("content", "").strip()
        history_lines.append(f"{role}: {content}")
    return "\n".join(history_lines)

def generate_rag_answer(
    query: str,
    chat_history: List[Dict[str, Any]],
    doc_id: Optional[str] = None,
    top_k: int = 4,
    api_key_override: Optional[str] = None,
    model_name: Optional[str] = None
) -> Dict[str, Any]:
    """
    Complete RAG workflow:
    1. Retrieve relevant chunks from vector store.
    2. Format prompt with context and conversation history.
    3. Generate answer using Gemini LLM (or robust intelligent extractive fallback).
    4. Return answer and formatted source citations.
    """
    api_key = get_gemini_api_key(api_key_override)
    model = model_name or DEFAULT_MODEL

    # Step 1: Retrieval
    relevant_chunks = vector_store.search(
        query=query,
        top_k=top_k,
        doc_id=doc_id,
        api_key=api_key if api_key else None
    )

    # Format sources for frontend
    sources = []
    for c in relevant_chunks:
        sources.append({
            "chunk_id": c.get("chunk_id", ""),
            "doc_id": c.get("doc_id", ""),
            "filename": c.get("filename", "document.pdf"),
            "page_number": c.get("page_number", 1),
            "similarity": c.get("similarity", 0.8),
            "snippet": c.get("text", "")[:280] + ("..." if len(c.get("text", "")) > 280 else ""),
            "full_text": c.get("text", "")
        })

    # If no chunks found at all
    if not relevant_chunks:
        return {
            "answer": "I could not find any relevant information in the uploaded document(s) to answer your question. Please ensure documents have been uploaded and processed, or try rephrasing your query.",
            "sources": [],
            "model_used": "none"
        }

    # Step 2: Assemble prompt
    context_str = build_context_string(relevant_chunks)
    history_str = build_history_string(chat_history)

    prompt = f"""DOCUMENT CONTEXT:
{context_str}

CONVERSATION HISTORY:
{history_str}

CURRENT USER QUESTION:
{query}

Please answer the user question based on the document context above. Cite the source document name and page number when stating specific facts.
"""

    # Step 3: LLM Generation
    if api_key and GENAI_AVAILABLE:
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.3,
                    max_output_tokens=2048,
                )
            )
            answer_text = response.text or "I was unable to generate an answer."
            return {
                "answer": answer_text,
                "sources": sources,
                "model_used": model
            }
        except Exception as e:
            print(f"[RAG Engine] Gemini API error: {e}. Falling back to extractive synthesis.")
            # Fall back to extractive synthesis with error notice
            fallback_ans = generate_extractive_answer(query, relevant_chunks, error_notice=str(e))
            return {
                "answer": fallback_ans,
                "sources": sources,
                "model_used": "extractive-synthesizer (Gemini fallback)"
            }

    # Step 4: Extractive Synthesizer (when API key is not configured)
    fallback_ans = generate_extractive_answer(query, relevant_chunks, is_no_key=True)
    return {
        "answer": fallback_ans,
        "sources": sources,
        "model_used": "extractive-synthesizer"
    }

def generate_extractive_answer(
    query: str,
    chunks: List[Dict[str, Any]],
    is_no_key: bool = False,
    error_notice: Optional[str] = None
) -> str:
    """Synthesizes structured, high-value answers directly from matched chunks."""
    top_chunk = chunks[0]
    filename = top_chunk.get("filename", "document.pdf")
    page = top_chunk.get("page_number", 1)

    sections = []
    
    if is_no_key:
        sections.append(
            "> ℹ️ **Notice:** Running in **Direct RAG Mode**. Add your **Google Gemini API Key** in Settings (top right) to enable advanced generative reasoning and freeform conversation.\n"
        )
    elif error_notice:
        sections.append(
            f"> ⚠️ **LLM Notice:** Encountered an issue connecting to Gemini ({error_notice[:80]}). Displaying direct document excerpts retrieved via vector search:\n"
        )

    sections.append(f"### Relevant Findings for: *\"{query}\"*\n")
    sections.append(f"Based on the analysis of **{filename}** (Page {page}) and related excerpts:\n")

    for i, c in enumerate(chunks[:3], 1):
        f = c.get("filename", "Document")
        p = c.get("page_number", 1)
        txt = c.get("text", "").strip()
        # Clean excerpt to 2-3 key sentences
        lines = [line.strip() for line in txt.split("\n") if line.strip()]
        lead = " ".join(lines[:4])
        sections.append(f"**Key Point {i}** *(from `{f}`, Page {p})*:")
        sections.append(f"> {lead}\n")

    sections.append(
        "\n*See the **Sources** below for the full verbatim text from these pages.*"
    )
    return "\n".join(sections)

def generate_summary(
    doc_id: Optional[str] = None,
    api_key_override: Optional[str] = None,
    model_name: Optional[str] = None,
    summary_type: str = "comprehensive"
) -> Dict[str, Any]:
    """Generates an executive summary of one document or all uploaded documents."""
    api_key = get_gemini_api_key(api_key_override)
    model = model_name or DEFAULT_MODEL

    chunks = vector_store.get_chunks_by_document(doc_id) if doc_id and doc_id != "all" else vector_store.get_all_chunks()
    if not chunks:
        return {
            "summary": "No documents or content available to summarize. Please upload a PDF first.",
            "sources": []
        }

    # Grab representative chunks across the document
    step = max(1, len(chunks) // 8)
    sample_chunks = chunks[::step][:10]
    context_str = build_context_string(sample_chunks)

    prompt_instructions = {
        "comprehensive": "Provide a comprehensive summary including: Executive Overview, Key Themes & Findings, Major Sections, and Conclusions.",
        "takeaways": "Extract the top 5-7 actionable takeaways, key statistics, and critical insights from this document.",
        "faq": "Generate the top 5 most important Frequently Asked Questions (with clear answers) based strictly on this document.",
        "eli5": "Explain the core concepts and findings of this document in simple, clear terms that anyone can understand without technical jargon."
    }
    instruction = prompt_instructions.get(summary_type, prompt_instructions["comprehensive"])

    sources = [{
        "chunk_id": c.get("chunk_id", ""),
        "doc_id": c.get("doc_id", ""),
        "filename": c.get("filename", "doc.pdf"),
        "page_number": c.get("page_number", 1),
        "similarity": 1.0,
        "snippet": c.get("text", "")[:280]
    } for c in sample_chunks[:4]]

    if api_key and GENAI_AVAILABLE:
        try:
            client = genai.Client(api_key=api_key)
            prompt = f"""DOCUMENT CONTENT TO SUMMARIZE:
{context_str}

INSTRUCTIONS:
{instruction}
Format with markdown headers, bold points, and clean structure.
"""
            resp = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    temperature=0.2,
                    max_output_tokens=2048,
                )
            )
            return {
                "summary": resp.text or "Summary generation completed.",
                "sources": sources
            }
        except Exception as e:
            print(f"[RAG Engine] Summarization LLM error: {e}")

    # Fallback extractive summary
    first_chunk = chunks[0]
    filename = first_chunk.get("filename", "Uploaded PDF")
    total_pages = max(c.get("page_number", 1) for c in chunks)
    
    summary_md = f"""## 📑 Summary of {filename}
**Total Chunks Analyzed:** {len(chunks)} across {total_pages} pages.

### 📌 Overview & Key Highlights
{sample_chunks[0]['text'][:400]}...

### 🔍 Key Excerpts From Across the Document:
"""
    for i, sc in enumerate(sample_chunks[1:4], 1):
        summary_md += f"\n- **Section {i} (Page {sc['page_number']})**: {sc['text'][:250]}..."

    summary_md += "\n\n> 💡 *To generate an AI-synthesized executive summary, enter your Gemini API key in Settings.*"

    return {
        "summary": summary_md,
        "sources": sources
    }
