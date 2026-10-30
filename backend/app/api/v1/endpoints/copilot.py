"""
Crime Intelligence Copilot & Modus Operandi Vector Search Endpoints.
"""

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.copilot import (
    CopilotAskRequest,
    CopilotAskResponse,
    IndexTriggerRequest,
    MOSearchRequest,
    MOSearchResponse,
    VectorIndexStatus,
)
from app.services.rag.copilot import ask_intelligence_copilot, search_modus_operandi
from app.services.rag.embeddings import EMBEDDING_DIM
from app.services.rag.vector_store import vector_store

router = APIRouter(prefix="/copilot", tags=["copilot"])


@router.get("/status", response_model=VectorIndexStatus)
def get_vector_store_status(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Return current vector index status and statistics."""
    if not vector_store._is_loaded:
        vector_store.load_index(db)

    return VectorIndexStatus(
        total_indexed=vector_store.total_count,
        dimension=EMBEDDING_DIM,
        embedding_model=settings.GEMINI_EMBEDDING_MODEL or "models/gemini-embedding-001",
        chat_model=settings.GEMINI_CHAT_MODEL or "models/gemini-flash-latest",
        is_ready=vector_store.total_count > 0,
    )


@router.post("/search", response_model=MOSearchResponse)
def search_modus_operandi_endpoint(
    req: MOSearchRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Search historical police records by criminal Modus Operandi (M.O.) description.
    Computes dense cosine similarity between query semantics and past case narratives,
    accused profiles, and seized Muddayemal (vehicles/weapons).
    """
    results = search_modus_operandi(
        query=req.query,
        db=db,
        top_k=req.top_k,
        station_id=req.station_id,
        crime_type=req.crime_type,
    )

    return MOSearchResponse(
        query=req.query,
        total=len(results),
        results=results,
    )


@router.post("/ask", response_model=CopilotAskResponse)
def ask_copilot_endpoint(
    req: CopilotAskRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Crime Intelligence Copilot:
    Uses vector retrieval and Google Gemini LLM reasoning to generate an executive
    briefing answering tactical questions, citing matching case records [CS-xxxxx].
    """
    res = ask_intelligence_copilot(
        question=req.question,
        db=db,
        history=req.history,
        top_k=req.top_k,
    )
    return CopilotAskResponse(**res)


@router.post("/index")
def trigger_vector_indexing(
    req: IndexTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Trigger batch vectorization and indexing of incidents into PostgreSQL BYTEA
    and the in-memory cosine index.
    """
    indexed, total = vector_store.index_incidents(
        db=db,
        limit=req.limit,
        skip_already_indexed=req.skip_already_indexed,
    )
    return {
        "status": "success",
        "newly_indexed": indexed,
        "total_indexed": total,
    }
