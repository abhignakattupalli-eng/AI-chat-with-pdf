# AI Chat With PDF – Intelligent Document Assistant

A modern, full-stack Generative AI web application that enables users to upload PDF documents and interact with them through an intelligent, context-aware chatbot using **Retrieval-Augmented Generation (RAG)**.

Users can upload single or multiple documents, query across their entire document library or focus on specific files, receive precise answers with interactive page citations, generate summaries, and maintain multi-turn chat sessions.

---

## 🌟 Key Highlights

- **Multi-Document Ingestion & Management:** Upload one or several PDF files simultaneously with instant page extraction and chunk segmentation.
- **Intelligent Page-by-Page RAG:** Retains document name and exact page numbers for every extracted chunk, ensuring verifiable provenance.
- **Dual Vector Embedding Architecture:**
  - **Google Gemini Dense Embeddings (`text-embedding-004`)** when an API key is provided.
  - **Local TF-IDF & Subword Vectorizer** with Cosine Similarity as a zero-dependency, ultra-fast offline fallback.
- **Google Gemini Foundation Models:** Integrates Gemini 2.0 Flash, Gemini 1.5 Flash, and Gemini 1.5 Pro.
- **Grounding Citations & Proof Badges:** Every assistant response lists clickable citation tags (e.g. `📄 filename.pdf (Page 3)` with relevance match score). Clicking any badge opens an inspector displaying the verbatim PDF text.
- **Document Summarization & Quick Actions:** One-click generation of:
  - 📑 Executive Summaries
  - 💡 Key Takeaways & Action Items
  - ❓ 5 Critical FAQs & Answers
  - 🔍 Simple Explanations (ELI5)
- **Multi-Turn Session History:** Persistent session and chat message storage powered by SQLite.
- **Chunk Inspector Modal:** Transparently inspect how any document was divided into chunks, character counts, and page numbers.
- **Modern Light Theme Design:** Clean, distraction-free UI inspired by ChatGPT and NotebookLM with soft blue/purple accents, rounded cards, subtle shadows, and Lucide React icons.
- **1-Click Built-in Sample PDFs:** Comes pre-packaged with 2 sample technical reports (Artificial Intelligence RAG Architecture & Quantum Cryptography) for instant testing.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       React + Vite                          │
│        (Navbar, Sidebar, ChatCanvas, Modals, Lucide)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / JSON
┌──────────────────────────────▼──────────────────────────────┐
│                     FastAPI Application                     │
│  ├── Document Upload & Metadata API                         │
│  ├── Multi-Turn Chat & Session Store (SQLite)               │
│  ├── PyPDF Extraction Engine                                │
│  ├── Sliding Window Chunker (with Page Tracking)            │
│  ├── Vector Store (Cosine Similarity / Dense / TF-IDF)      │
│  └── RAG Grounding Engine (Google Gemini 2.0 / Synthesizer) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Lucide React icons, React-Markdown, Remark-GFM
- **Backend:** Python 3.14 / 3.11+, FastAPI, Uvicorn, Pydantic, Python-Multipart
- **PDF Extraction:** PyPDF
- **Vector Embeddings & RAG:** Google GenAI SDK (`google-genai`), NumPy, Scikit-Learn
- **Database:** SQLite3 (`data/app.db`)

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Python 3.10+ (tested on Python 3.14)
- Node.js 18+ and npm

### 2. Backend Setup

```bash
cd backend

# Create & activate virtual environment (if not already created)
python -m venv venv
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# (Optional) Generate sample PDF reports for instant testing
python create_sample_docs.py

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

The backend server will run at `http://127.0.0.1:8000`.

### 3. Frontend Setup

In another terminal:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will run at `http://127.0.0.1:5173` with automatic API proxying to `http://127.0.0.1:8000`.

*(Alternatively, the built production frontend is automatically served directly by FastAPI at `http://127.0.0.1:8000/`)*.

---

## 🔑 Gemini API Key Configuration

The application works out of the box with intelligent direct RAG retrieval. To unlock generative AI reasoning:

1. Click the **Settings ⚙️** icon in the top navigation bar.
2. Enter your [Google Gemini API Key](https://aistudio.google.com/app/apikey).
3. Click **Verify** to validate your key in real time, then click **Save Settings**.
4. Alternatively, create a `.env` file in the `backend/` folder:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.0-flash
   CHUNK_SIZE=750
   CHUNK_OVERLAP=150
   TOP_K=4
   ```

---

## 📚 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/documents/upload` | Upload and chunk single or multiple PDF documents |
| `GET` | `/api/documents` | List all indexed documents with page and chunk counts |
| `DELETE` | `/api/documents/{doc_id}` | Delete a document, file on disk, and vector chunks |
| `GET` | `/api/documents/{doc_id}/chunks` | Inspect segmented chunks of a document |
| `POST` | `/api/documents/load-samples` | Load the 2 built-in sample technical PDFs |
| `POST` | `/api/sessions` | Create a new conversation session |
| `GET` | `/api/sessions` | List all user chat sessions |
| `GET` | `/api/sessions/{session_id}` | Retrieve chat history and citations for a session |
| `DELETE` | `/api/sessions/{session_id}` | Delete a chat session and its messages |
| `DELETE` | `/api/sessions/{session_id}/messages` | Clear messages in a session |
| `POST` | `/api/chat` | Send a question and retrieve RAG answer with page citations |
| `POST` | `/api/summarize` | Generate structured executive summary or takeaways |
| `GET` | `/api/status` | System health, vector store stats, and active model |
| `POST` | `/api/test-key` | Test and verify a Gemini API key |

---

## 🧪 Testing the Application

1. Open `http://127.0.0.1:5173` (or `http://127.0.0.1:8000`).
2. Click **"Load 2 Built-in Sample PDFs"** in the sidebar.
3. You will see:
   - `AI_Technology_and_RAG_Architecture_Report.pdf` (4 pages, 9 chunks)
   - `Quantum_Computing_and_Cryptography_Whitepaper.pdf` (3 pages, 6 chunks)
4. Click one of the suggested inquiry cards or ask:
   - *"What is the optimal chunk size and overlap for RAG?"*
   - *"How does Shor's algorithm threaten RSA encryption?"*
5. Notice the exact source citations below the response showing document name, page number, and similarity score.
6. Click the citation badge to inspect the verbatim text excerpt.
7. Try the **"Summarize"** dropdown to generate an Executive Summary or Key Takeaways in one click.
