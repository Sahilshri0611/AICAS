"""
In-memory Vector Store backed by PostgreSQL BYTEA storage.

Maintains a normalized NumPy matrix (N, 3072) in RAM for microsecond cosine similarity
search across thousands of Nagpur police records.
"""

from datetime import datetime
import logging
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.crime import Incident, Suspect
from app.models.embedding import IncidentEmbedding
from app.models.evidence import MaterialEvidence
from app.services.rag.embeddings import (
    EMBEDDING_DIM,
    deserialize_vector,
    embed_batch,
    embed_text,
    generate_fallback_embedding,
    serialize_vector,
)

logger = logging.getLogger(__name__)


def build_incident_chunk_text(incident: Incident) -> str:
    """
    Construct a dense, structured Modus Operandi (M.O.) text representation of an Incident,
    including crime type, location, FIR narrative, accused profiles, and seized physical evidence.
    """
    parts = [
        f"Case Number: {incident.crime_id}",
        f"Crime Category: {incident.primary_type}",
    ]
    if incident.description:
        parts.append(f"Sub-type / Nature: {incident.description}")

    if incident.police_station:
        parts.append(f"Police Station: {incident.police_station}")
    if incident.zone_name:
        parts.append(f"Police Zone: {incident.zone_name}")

    if incident.location_description:
        parts.append(f"Location Details: {incident.location_description}")
    if incident.block:
        parts.append(f"Street / Block: {incident.block}")

    if incident.occurred_at:
        parts.append(f"Date & Time: {incident.occurred_at.strftime('%Y-%m-%d %H:%M')}")

    # Rich summary / narrative
    summary = incident.summary or incident.description or ""
    if summary:
        parts.append(f"Modus Operandi & Incident Narrative: {summary}")

    # Accused & Suspects
    if incident.suspects:
        suspect_descs = []
        for s in incident.suspects:
            s_str = s.name
            if s.alias:
                s_str += f" @ {s.alias}"
            if s.vehicle:
                s_str += f" (Vehicle: {s.vehicle})"
            if s.description:
                s_str += f" - {s.description}"
            suspect_descs.append(s_str)
        parts.append(f"Accused / Suspects: {'; '.join(suspect_descs)}")

    # Material Evidence / Seized Vehicles / Weapons
    if incident.material_evidences:
        evid_descs = []
        for e in incident.material_evidences:
            e_str = f"[{e.item_type}] {e.item_name}"
            if e.identifier:
                e_str += f" (Reg/ID: {e.identifier})"
            if e.description:
                e_str += f" - {e.description}"
            evid_descs.append(e_str)
        parts.append(f"Seized Physical Evidence (Muddayemal): {'; '.join(evid_descs)}")

    return "\n".join(parts)


class VectorStore:
    def __init__(self):
        self._matrix: Optional[np.ndarray] = None  # (N, D)
        self._incident_ids: List[int] = []
        self._metadata: Dict[int, Dict[str, Any]] = {}
        self._is_loaded = False

    @property
    def total_count(self) -> int:
        return len(self._incident_ids)

    def load_index(self, db: Session) -> int:
        """
        Load all stored embeddings from PostgreSQL `incident_embeddings` into memory.
        """
        stmt = (
            select(
                IncidentEmbedding.incident_id,
                IncidentEmbedding.embedding,
                Incident.crime_id,
                Incident.primary_type,
                Incident.community_area,
                Incident.district,
                Incident.occurred_at,
                Incident.summary,
            )
            .join(Incident, Incident.id == IncidentEmbedding.incident_id)
        )
        rows = db.execute(stmt).all()

        if not rows:
            self._matrix = np.empty((0, EMBEDDING_DIM), dtype=np.float32)
            self._incident_ids = []
            self._metadata = {}
            self._is_loaded = True
            logger.info("Vector index loaded: 0 records.")
            return 0

        vectors: List[np.ndarray] = []
        incident_ids: List[int] = []
        metadata: Dict[int, Dict[str, Any]] = {}

        for row in rows:
            inc_id, raw_bytes, crime_id, p_type, comm_area, dist, occ_at, summary = row
            try:
                vec = deserialize_vector(raw_bytes)
                if vec.shape[0] != EMBEDDING_DIM:
                    # Pad or truncate if dimensions differ
                    if vec.shape[0] < EMBEDDING_DIM:
                        pad = np.zeros(EMBEDDING_DIM - vec.shape[0], dtype=np.float32)
                        vec = np.concatenate([vec, pad])
                    else:
                        vec = vec[:EMBEDDING_DIM]
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm
                vectors.append(vec)
                incident_ids.append(inc_id)
                metadata[inc_id] = {
                    "incident_id": inc_id,
                    "crime_id": crime_id,
                    "primary_type": p_type,
                    "station_id": comm_area,
                    "district": dist,
                    "occurred_at": occ_at.isoformat() if occ_at else None,
                    "summary": (summary[:200] + "...") if summary and len(summary) > 200 else summary,
                }
            except Exception as e:
                logger.error(f"Error deserializing vector for incident {inc_id}: {e}")

        if vectors:
            self._matrix = np.vstack(vectors).astype(np.float32)
        else:
            self._matrix = np.empty((0, EMBEDDING_DIM), dtype=np.float32)

        self._incident_ids = incident_ids
        self._metadata = metadata
        self._is_loaded = True
        logger.info(f"Loaded {len(incident_ids)} incident vectors into RAM.")
        return len(incident_ids)

    def search(
        self,
        query_text: str,
        db: Session,
        top_k: int = 10,
        station_id: Optional[int] = None,
        crime_type: Optional[str] = None,
        min_similarity: float = 0.15,
    ) -> List[Dict[str, Any]]:
        """
        Execute semantic cosine similarity search against indexed incidents.
        Returns top matching incidents with similarity scores and rich details.
        """
        if not self._is_loaded:
            self.load_index(db)

        if self._matrix is None or len(self._incident_ids) == 0:
            return []

        # Generate query vector
        query_vec = embed_text(query_text)
        q_norm = np.linalg.norm(query_vec)
        if q_norm > 0:
            query_vec = query_vec / q_norm

        # Matrix dot product (cosine similarity since vectors are unit normalized)
        sim_scores = np.dot(self._matrix, query_vec)

        # Apply metadata filters
        valid_indices = []
        for idx, inc_id in enumerate(self._incident_ids):
            meta = self._metadata.get(inc_id, {})
            if station_id is not None and meta.get("station_id") != station_id:
                continue
            if crime_type and meta.get("primary_type", "").upper() != crime_type.upper():
                continue
            if sim_scores[idx] >= min_similarity:
                valid_indices.append(idx)

        if not valid_indices:
            return []

        # Sort filtered candidates descending by similarity
        valid_indices.sort(key=lambda i: sim_scores[i], reverse=True)
        top_indices = valid_indices[:top_k]

        matched_ids = [self._incident_ids[i] for i in top_indices]

        # Fetch full incidents with relationships
        incidents_query = (
            select(Incident)
            .where(Incident.id.in_(matched_ids))
        )
        incidents_map = {inc.id: inc for inc in db.execute(incidents_query).scalars().all()}

        results = []
        for idx in top_indices:
            inc_id = self._incident_ids[idx]
            inc = incidents_map.get(inc_id)
            if not inc:
                continue

            score = float(sim_scores[idx])
            # Normalize score to percentage (0.0 to 1.0)
            score_clamped = max(0.0, min(1.0, (score + 1.0) / 2.0 if score < 0 else score))

            suspects_list = [
                {
                    "name": s.name,
                    "alias": s.alias,
                    "vehicle": s.vehicle,
                    "description": s.description,
                }
                for s in inc.suspects
            ]

            evidences_list = [
                {
                    "item_type": e.item_type,
                    "item_name": e.item_name,
                    "identifier": e.identifier,
                    "description": e.description,
                    "custody_status": e.custody_status,
                }
                for e in inc.material_evidences
            ]

            results.append({
                "incident_id": inc.id,
                "crime_id": inc.crime_id,
                "case_number": inc.case_number,
                "primary_type": inc.primary_type,
                "description": inc.description,
                "police_station": inc.police_station,
                "zone_name": inc.zone_name,
                "occurred_at": inc.occurred_at.isoformat() if inc.occurred_at else None,
                "summary": inc.summary or inc.description or "",
                "similarity_score": round(score_clamped, 4),
                "similarity_percent": round(score_clamped * 100, 1),
                "suspects": suspects_list,
                "material_evidences": evidences_list,
            })

        return results

    def index_incidents(
        self,
        db: Session,
        limit: int = 500,
        skip_already_indexed: bool = True,
    ) -> Tuple[int, int]:
        """
        Embed and persist embeddings for incidents in the database.
        Returns (newly_indexed_count, total_indexed_count).
        """
        query = select(Incident)
        if skip_already_indexed:
            query = query.outerjoin(IncidentEmbedding).where(IncidentEmbedding.id.is_(None))
        query = query.limit(limit)

        incidents = db.execute(query).scalars().all()
        if not incidents:
            return 0, self.total_count

        logger.info(f"Vectorizing {len(incidents)} incidents...")
        chunks = [build_incident_chunk_text(inc) for inc in incidents]

        # Generate embeddings
        vectors = embed_batch(chunks)

        for inc, chunk_text, vec in zip(incidents, chunks, vectors):
            emb_record = IncidentEmbedding(
                incident_id=inc.id,
                chunk_text=chunk_text,
                embedding=serialize_vector(vec),
            )
            db.merge(emb_record)

        db.commit()
        # Reload memory index
        total = self.load_index(db)
        return len(incidents), total


# Global singleton vector store instance
vector_store = VectorStore()
