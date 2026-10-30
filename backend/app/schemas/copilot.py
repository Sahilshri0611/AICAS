"""
Pydantic schemas for the Vector RAG & Crime Intelligence Copilot.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class MOSearchRequest(BaseModel):
    query: str = Field(..., description="Natural language description of criminal Modus Operandi (e.g. 'two men on pulsar bike snatched necklace')")
    top_k: int = Field(10, ge=1, le=50, description="Max number of matching cases to return")
    station_id: Optional[int] = Field(None, description="Optional police station ID filter")
    crime_type: Optional[str] = Field(None, description="Optional crime type filter")


class MOSearchResultItem(BaseModel):
    incident_id: int
    crime_id: str
    case_number: Optional[str] = None
    primary_type: str
    description: Optional[str] = None
    police_station: Optional[str] = None
    zone_name: Optional[str] = None
    occurred_at: Optional[str] = None
    summary: str
    similarity_score: float
    similarity_percent: float
    suspects: List[Dict[str, Any]] = []
    material_evidences: List[Dict[str, Any]] = []


class MOSearchResponse(BaseModel):
    query: str
    total: int
    results: List[MOSearchResultItem]


class CopilotAskRequest(BaseModel):
    question: str = Field(..., description="Natural language question for intelligence copilot")
    history: Optional[List[Dict[str, str]]] = Field(default=[], description="Chat history")
    top_k: int = Field(6, ge=1, le=20, description="Number of context cases to retrieve")


class CopilotAskResponse(BaseModel):
    question: str
    answer: str
    cited_cases: List[MOSearchResultItem] = []
    total_matches: int = 0
    suggested_follow_ups: List[str] = []


class IndexTriggerRequest(BaseModel):
    limit: int = Field(500, ge=1, le=5000)
    skip_already_indexed: bool = True


class VectorIndexStatus(BaseModel):
    total_indexed: int
    dimension: int
    embedding_model: str
    chat_model: str
    is_ready: bool
