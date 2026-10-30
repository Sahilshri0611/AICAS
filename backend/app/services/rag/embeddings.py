"""
Embedding service for CrimeSense AI.

Uses Google Gemini (models/gemini-embedding-001) to compute high-density 3072-dimensional
semantic vector embeddings of police incident narratives, Modus Operandi (M.O.),
suspect behaviors, and material evidence.

Includes a deterministic fallback embedding generator for offline/rate-limited operation.
"""

import hashlib
import logging
import time
from typing import List
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)

EMBEDDING_DIM = 3072


def serialize_vector(vector: np.ndarray) -> bytes:
    """Serialize a numpy float32 vector into raw bytes for PostgreSQL BYTEA storage."""
    return vector.astype(np.float32).tobytes()


def deserialize_vector(data: bytes) -> np.ndarray:
    """Deserialize raw bytes back into a numpy float32 vector."""
    return np.frombuffer(data, dtype=np.float32)


def generate_fallback_embedding(text: str, dim: int = EMBEDDING_DIM) -> np.ndarray:
    """
    Deterministic semantic hash embedding based on character n-grams and word tokens.
    Used when the remote Gemini API is unavailable or rate-limited.
    Produces a unit-normalized float32 vector of length `dim`.
    """
    clean_text = (text or "").lower().strip()
    if not clean_text:
        v = np.zeros(dim, dtype=np.float32)
        v[0] = 1.0
        return v

    vec = np.zeros(dim, dtype=np.float32)

    # Word n-grams and char n-grams
    words = clean_text.split()
    tokens = list(words)
    # Add char 3-grams
    for word in words:
        if len(word) >= 3:
            for i in range(len(word) - 2):
                tokens.append(word[i : i + 3])

    for token in tokens:
        h = int(hashlib.sha256(token.encode("utf-8")).hexdigest(), 16)
        idx = h % dim
        sign = 1.0 if ((h >> 16) % 2 == 0) else -1.0
        vec[idx] += sign

    norm = np.linalg.norm(vec)
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return vec.astype(np.float32)


def get_gemini_client():
    """Lazily instantiate google.genai Client."""
    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return None
    try:
        from google import genai
        return genai.Client(api_key=api_key)
    except Exception as e:
        logger.warning(f"Failed to initialize google.genai Client: {e}")
        return None


def embed_text(text: str, prefer_fast: bool = True) -> np.ndarray:
    """
    Generate a 3072-dimensional vector embedding for a single text chunk.
    If prefer_fast is True (matching the indexed database space), generates the instant
    deterministic semantic vector in <1ms without network latency.
    """
    if not text:
        return np.zeros(EMBEDDING_DIM, dtype=np.float32)

    if not prefer_fast:
        client = get_gemini_client()
        if client:
            try:
                model_name = settings.GEMINI_EMBEDDING_MODEL or "models/gemini-embedding-001"
                res = client.models.embed_content(
                    model=model_name,
                    contents=text,
                )
                if hasattr(res, "embeddings") and res.embeddings:
                    raw_vals = res.embeddings[0].values
                    vec = np.array(raw_vals, dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    if norm > 0:
                        vec = vec / norm
                    return vec
            except Exception as e:
                logger.warning(f"Gemini API embed_content failed: {e}. Using fallback embedding.")

    return generate_fallback_embedding(text, dim=EMBEDDING_DIM)


def embed_batch(texts: List[str], delay_between_calls: float = 0.05) -> List[np.ndarray]:
    """
    Generate embeddings for a list of texts.
    Uses batching or sequential embedding with subtle backoff.
    """
    results: List[np.ndarray] = []
    client = get_gemini_client()

    for idx, text in enumerate(texts):
        if not text:
            results.append(np.zeros(EMBEDDING_DIM, dtype=np.float32))
            continue

        embedded = False
        if client:
            try:
                model_name = settings.GEMINI_EMBEDDING_MODEL or "models/gemini-embedding-001"
                res = client.models.embed_content(
                    model=model_name,
                    contents=text,
                )
                if hasattr(res, "embeddings") and res.embeddings:
                    vec = np.array(res.embeddings[0].values, dtype=np.float32)
                    norm = np.linalg.norm(vec)
                    if norm > 0:
                        vec = vec / norm
                    results.append(vec)
                    embedded = True
                    if delay_between_calls > 0:
                        time.sleep(delay_between_calls)
            except Exception as e:
                logger.warning(f"Batch embed item {idx} failed: {e}")

        if not embedded:
            results.append(generate_fallback_embedding(text, dim=EMBEDDING_DIM))

    return results
