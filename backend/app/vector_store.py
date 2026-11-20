import json
import numpy as np
from pathlib import Path
from typing import List, Dict, Any, Optional
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from .config import VECTOR_INDEX_PATH, DEFAULT_EMBEDDING_MODEL

try:
    from google import genai
    from google.genai import types
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

class VectorStore:
    def __init__(self, index_path: Path = VECTOR_INDEX_PATH):
        self.index_path = index_path
        self.chunks: List[Dict[str, Any]] = []
        self.tfidf_vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix: Optional[np.ndarray] = None
        self.dense_embeddings: Optional[np.ndarray] = None
        self.embedding_type = "tfidf"  # "gemini" or "tfidf"
        self.load()

    def load(self):
        """Loads chunks and metadata from disk."""
        if self.index_path.exists():
            try:
                with open(self.index_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.chunks = data.get("chunks", [])
                    self.embedding_type = data.get("embedding_type", "tfidf")
                self._rebuild_tfidf()
                print(f"[VectorStore] Loaded {len(self.chunks)} chunks from {self.index_path}")
            except Exception as e:
                print(f"[VectorStore] Error loading index: {e}")
                self.chunks = []
        else:
            self.chunks = []

    def save(self):
        """Persists chunks to disk."""
        try:
            with open(self.index_path, "w", encoding="utf-8") as f:
                json.dump({
                    "chunks": self.chunks,
                    "embedding_type": self.embedding_type
                }, f, ensure_ascii=False, indent=2)
        except Exception as e:
            print(f"[VectorStore] Error saving index: {e}")

    def _rebuild_tfidf(self):
        """Rebuilds TF-IDF index for fast keyword & semantic matching."""
        if not self.chunks:
            self.tfidf_vectorizer = None
            self.tfidf_matrix = None
            return

        texts = [c["text"] for c in self.chunks]
        self.tfidf_vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words='english',
            max_features=10000,
            sublinear_tf=True
        )
        try:
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(texts)
        except Exception as e:
            print(f"[VectorStore] TF-IDF rebuild warning: {e}")
            self.tfidf_matrix = None

    def add_chunks(self, new_chunks: List[Dict[str, Any]], api_key: Optional[str] = None):
        """Adds chunks to store and updates indexes."""
        if not new_chunks:
            return

        # Add chunks
        self.chunks.extend(new_chunks)
        self._rebuild_tfidf()
        self.save()
        print(f"[VectorStore] Added {len(new_chunks)} chunks. Total: {len(self.chunks)}")

    def delete_document(self, doc_id: str) -> int:
        """Deletes all chunks belonging to a document."""
        initial_len = len(self.chunks)
        self.chunks = [c for c in self.chunks if c.get("doc_id") != doc_id]
        removed = initial_len - len(self.chunks)
        self._rebuild_tfidf()
        self.save()
        return removed

    def get_chunks_by_document(self, doc_id: str) -> List[Dict[str, Any]]:
        return [c for c in self.chunks if c.get("doc_id") == doc_id]

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        return self.chunks

    def count(self) -> int:
        return len(self.chunks)

    def search(
        self,
        query: str,
        top_k: int = 4,
        doc_id: Optional[str] = None,
        api_key: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves top_k relevant chunks for the given query.
        Uses Gemini embeddings if api_key is available, else TF-IDF cosine similarity.
        """
        if not self.chunks:
            return []

        # Filter candidate pool if doc_id is specified
        if doc_id and doc_id != "all":
            candidate_indices = [i for i, c in enumerate(self.chunks) if c.get("doc_id") == doc_id]
        else:
            candidate_indices = list(range(len(self.chunks)))

        if not candidate_indices:
            return []

        # Try Gemini dense embeddings if api_key is provided
        if api_key and GENAI_AVAILABLE:
            try:
                results = self._search_gemini(query, candidate_indices, top_k, api_key)
                if results:
                    return results
            except Exception as e:
                print(f"[VectorStore] Gemini embedding search fallback to TF-IDF: {e}")

        # Fallback to TF-IDF Cosine Similarity
        return self._search_tfidf(query, candidate_indices, top_k)

    def _search_tfidf(self, query: str, candidate_indices: List[int], top_k: int) -> List[Dict[str, Any]]:
        if not self.tfidf_vectorizer or self.tfidf_matrix is None:
            # Fallback simple text match
            q_lower = query.lower()
            scored = []
            for idx in candidate_indices:
                chunk = self.chunks[idx]
                score = sum(1 for word in q_lower.split() if word in chunk["text"].lower())
                scored.append((score, chunk))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [
                {**chunk, "score": float(score), "similarity": round(float(score / (len(q_lower.split()) or 1)), 3)}
                for score, chunk in scored[:top_k]
            ]

        try:
            q_vec = self.tfidf_vectorizer.transform([query])
            sub_matrix = self.tfidf_matrix[candidate_indices]
            sims = cosine_similarity(q_vec, sub_matrix).flatten()

            # Rank candidates
            ranked_order = np.argsort(sims)[::-1][:top_k]
            results = []
            for rank_idx in ranked_order:
                sim_score = float(sims[rank_idx])
                actual_idx = candidate_indices[rank_idx]
                chunk = self.chunks[actual_idx]
                results.append({
                    "chunk_id": chunk["chunk_id"],
                    "doc_id": chunk["doc_id"],
                    "filename": chunk["filename"],
                    "page_number": chunk["page_number"],
                    "chunk_index": chunk["chunk_index"],
                    "text": chunk["text"],
                    "score": round(sim_score, 4),
                    "similarity": round(max(0.1, sim_score), 3)
                })
            return results
        except Exception as e:
            print(f"[VectorStore] TF-IDF search error: {e}")
            return [self.chunks[i] for i in candidate_indices[:top_k]]

    def _search_gemini(
        self,
        query: str,
        candidate_indices: List[int],
        top_k: int,
        api_key: str
    ) -> List[Dict[str, Any]]:
        """Uses Google GenAI SDK to generate query embedding and compute cosine distance."""
        client = genai.Client(api_key=api_key)
        # Compute query embedding
        query_resp = client.models.embed_content(
            model=DEFAULT_EMBEDDING_MODEL,
            contents=query
        )
        query_vec = np.array(query_resp.embeddings[0].values, dtype=np.float32)

        # Batch embed candidate texts if needed (cache or on the fly)
        # For responsiveness and token economy, we compute candidate embeddings or fallback
        # Let's compute cosine similarity with chunk text embeddings
        candidate_texts = [self.chunks[i]["text"][:1000] for i in candidate_indices]
        
        # Batch embed candidates (up to 30 items)
        slice_indices = candidate_indices[:40]
        slice_texts = [self.chunks[i]["text"][:1000] for i in slice_indices]
        
        batch_resp = client.models.embed_content(
            model=DEFAULT_EMBEDDING_MODEL,
            contents=slice_texts
        )
        
        results = []
        for i, emb in enumerate(batch_resp.embeddings):
            cand_vec = np.array(emb.values, dtype=np.float32)
            denom = (np.linalg.norm(query_vec) * np.linalg.norm(cand_vec))
            cos_sim = float(np.dot(query_vec, cand_vec) / (denom + 1e-9))
            
            chunk = self.chunks[slice_indices[i]]
            results.append({
                "chunk_id": chunk["chunk_id"],
                "doc_id": chunk["doc_id"],
                "filename": chunk["filename"],
                "page_number": chunk["page_number"],
                "chunk_index": chunk["chunk_index"],
                "text": chunk["text"],
                "score": round(cos_sim, 4),
                "similarity": round(max(0.0, cos_sim), 3)
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]

# Global singleton
vector_store = VectorStore()
