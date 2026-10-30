"""
Index Incident Vectors into PostgreSQL incident_embeddings table.

Populates 3072-dimensional vector embeddings for incidents in the CrimeSense AI database.
Supports batch embedding with Gemini API for top recent cases and fast deterministic semantic
vectors for historical records, ensuring all 8,000 incidents are immediately searchable in RAM.
"""

import sys
import time
from sqlalchemy import select
from app.core.database import SessionLocal
from app.models.crime import Incident
from app.models.embedding import IncidentEmbedding
from app.services.rag.embeddings import (
    embed_text,
    generate_fallback_embedding,
    serialize_vector,
)
from app.services.rag.vector_store import build_incident_chunk_text, vector_store


def run_indexing(target_count: int = 8000, gemini_api_sample: int = 0):
    print(f"=== Starting Incident Vector Indexing (Target: {target_count}) ===")
    start_time = time.time()

    with SessionLocal() as db:
        # Check existing
        existing_ids = set(db.execute(select(IncidentEmbedding.incident_id)).scalars().all())
        print(f"Existing embeddings in DB: {len(existing_ids)}")

        # Fetch incidents without embeddings
        query = (
            select(Incident)
            .order_by(Incident.occurred_at.desc())
        )
        all_incidents = db.execute(query).scalars().all()
        to_index = [inc for inc in all_incidents if inc.id not in existing_ids][:target_count]

        print(f"Found {len(to_index)} incidents needing vector embeddings.")
        if not to_index:
            print("All requested incidents are already indexed!")
            vector_store.load_index(db)
            return

        batch_records = []
        gemini_count = 0
        fallback_count = 0

        for i, inc in enumerate(to_index):
            chunk = build_incident_chunk_text(inc)

            # Use Gemini API for first N key cases, fast semantic vector for rest
            if gemini_count < gemini_api_sample:
                try:
                    vec = embed_text(chunk)
                    gemini_count += 1
                except Exception:
                    vec = generate_fallback_embedding(chunk)
                    fallback_count += 1
            else:
                vec = generate_fallback_embedding(chunk)
                fallback_count += 1

            record = IncidentEmbedding(
                incident_id=inc.id,
                chunk_text=chunk,
                embedding=serialize_vector(vec),
            )
            batch_records.append(record)

            if len(batch_records) >= 200:
                db.add_all(batch_records)
                db.commit()
                batch_records.clear()
                print(f"  Indexed {i + 1}/{len(to_index)} incidents...")

        if batch_records:
            db.add_all(batch_records)
            db.commit()
            batch_records.clear()

        elapsed = round(time.time() - start_time, 2)
        print(f"Successfully indexed {len(to_index)} incidents in {elapsed}s!")
        print(f"  - Gemini API Embeddings: {gemini_count}")
        print(f"  - Semantic Hash Vectors: {fallback_count}")

        # Reload RAM vector store
        loaded = vector_store.load_index(db)
        print(f"VectorStore RAM index ready with {loaded} total vectors.")


if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 1500
    run_indexing(target_count=count)
