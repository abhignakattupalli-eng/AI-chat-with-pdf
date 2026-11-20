import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file from project root or backend dir if present
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")
load_dotenv(BASE_DIR.parent / ".env")

# If running on Vercel Serverless, use writable /tmp storage
IS_VERCEL = bool(os.getenv("VERCEL"))

if IS_VERCEL:
    UPLOAD_DIR = Path("/tmp/uploads")
    DATA_DIR = Path("/tmp/data")
else:
    UPLOAD_DIR = BASE_DIR / "uploads"
    DATA_DIR = BASE_DIR / "data"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "app.db"
VECTOR_INDEX_PATH = DATA_DIR / "vector_store.json"

DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
DEFAULT_EMBEDDING_MODEL = "text-embedding-004"
DEFAULT_CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "750"))
DEFAULT_CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
DEFAULT_TOP_K = int(os.getenv("TOP_K", "4"))

def get_gemini_api_key(override_key: str = None) -> str:
    """Return API key prioritizing user override, then environment variable."""
    if override_key and override_key.strip():
        return override_key.strip()
    return os.getenv("GEMINI_API_KEY", "").strip()
