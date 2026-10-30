"""
Crime Intelligence Copilot service.

Integrates dense vector retrieval (Modus Operandi semantic search) with Google Gemini LLM reasoning.
Produces executive intelligence briefings for police investigators, citing specific case numbers ([CS-xxxxx]),
accused profiles, and seized Muddayemal (material evidence).
"""

import logging
import re
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.rag.embeddings import get_gemini_client
from app.services.rag.vector_store import vector_store

logger = logging.getLogger(__name__)

COPILOT_SYSTEM_PROMPT = """You are CrimeSense AI, the Senior Crime Intelligence Analyst Copilot for Nagpur City Police.
You assist senior investigating officers (ACP/DCP/DSPs and Station House Officers) with high-priority crime pattern recognition, modus operandi analysis, and suspect tracking.

Your responses must be:
1. Professional, tactical, and formatted for police leadership.
2. Strictly grounded in the provided Case Context.
3. Explicit in citing Case Numbers in square brackets like [CS-00123] whenever mentioning incidents, dates, suspects, or seized property.
4. Structured into clear operational sections:
   - **Executive Summary**: Core pattern or immediate findings.
   - **Modus Operandi (M.O.) Analysis**: Criminal techniques, timing, weapons, and method of entry/escape.
   - **Identified Accused & Vehicles**: Suspects, aliases, and vehicle registration numbers linked to the cases.
   - **Tactical Directives**: Specific recommended actions (e.g., Nakabandi checkpoints, targeted beat patrols, Malkhana verification).
"""


def format_context_for_llm(retrieved_cases: List[Dict[str, Any]]) -> str:
    """Format top-retrieved cases into clean context chunks for the LLM."""
    if not retrieved_cases:
        return "No matching historical police records found."

    lines = []
    for c in retrieved_cases:
        lines.append(f"--- CASE {c['crime_id']} ---")
        lines.append(f"Type: {c['primary_type']}")
        if c.get("police_station"):
            lines.append(f"Police Station: {c['police_station']} ({c.get('zone_name', '')})")
        if c.get("occurred_at"):
            lines.append(f"Date & Time: {c['occurred_at']}")
        if c.get("summary"):
            lines.append(f"Narrative / M.O.: {c['summary']}")

        suspects = c.get("suspects", [])
        if suspects:
            s_strs = [
                f"{s['name']}" + (f" @ {s['alias']}" if s.get('alias') else "") + (f" [Vehicle: {s['vehicle']}]" if s.get('vehicle') else "")
                for s in suspects
            ]
            lines.append(f"Suspects / Accused: {', '.join(s_strs)}")

        evidences = c.get("material_evidences", [])
        if evidences:
            e_strs = [
                f"[{e.get('item_type', 'Evidence')}] {e.get('item_name', '')}" + (f" (Reg/ID: {e['identifier']})" if e.get('identifier') else "") + (f" - {e['description']}" if e.get('description') else "")
                for e in evidences
            ]
            lines.append(f"Seized Evidence / Muddayemal: {', '.join(e_strs)}")
        lines.append("")

    return "\n".join(lines)


def generate_heuristic_briefing(question: str, retrieved_cases: List[Dict[str, Any]]) -> str:
    """
    Generate a high-grade heuristic police briefing if the remote LLM is unreachable.
    Guarantees zero downtime and complete answers for investigators.
    """
    if not retrieved_cases:
        return (
            "### Executive Summary\n"
            "No historical records matching the specified criminal pattern were found in the database. "
            "Recommend broadening search terms or verifying alternate crime categories."
        )

    top_case = retrieved_cases[0]
    all_stations = list({c["police_station"] for c in retrieved_cases if c.get("police_station")})
    all_types = list({c["primary_type"] for c in retrieved_cases if c.get("primary_type")})

    all_suspects = []
    for c in retrieved_cases:
        for s in c.get("suspects", []):
            name = s["name"] + (f" @ {s['alias']}" if s.get("alias") else "")
            if name not in all_suspects:
                all_suspects.append(name)

    all_vehicles = []
    for c in retrieved_cases:
        for e in c.get("material_evidences", []):
            if e.get("item_type") == "Vehicle" or "MH-" in str(e.get("identifier", "")):
                all_vehicles.append(f"{e.get('identifier') or e.get('item_name')} ({e.get('item_name', 'Vehicle')})")

    briefing = []
    briefing.append("### Executive Summary & Tactical Assessment")
    briefing.append(
        f"Analysis of query *'{question}'* correlated **{len(retrieved_cases)} relevant police incident records** "
        f"across jurisdiction(s): {', '.join(all_stations[:4]) or 'Nagpur Metro'}. "
        f"The primary category identified is **{', '.join(all_types)}**, with strongest correlation to case **[{top_case['crime_id']}]** "
        f"({top_case.get('similarity_percent', 90)}% M.O. match)."
    )

    briefing.append("\n### Modus Operandi & Pattern Analysis")
    for idx, c in enumerate(retrieved_cases[:3], start=1):
        briefing.append(
            f"{idx}. **[{c['crime_id']}]** ({c.get('police_station', 'Nagpur')}, {c.get('occurred_at', 'Past record')}): "
            f"{c.get('summary', 'Standard incident recorded.')}"
        )

    briefing.append("\n### Identified Accused & Linked Vehicles")
    if all_suspects:
        briefing.append(f"- **Key Accused Tracked**: {', '.join(all_suspects[:5])}")
    else:
        briefing.append("- **Accused Profiles**: Unidentified suspects recorded; physical traits logged in FIR extracts.")

    if all_vehicles:
        briefing.append(f"- **Seized / Linked Vehicles**: {', '.join(all_vehicles[:4])}")
    else:
        briefing.append("- **Vehicles**: No specific registration numbers currently seized in these cases.")

    briefing.append("\n### Tactical Directives for Beat Staff")
    briefing.append(
        f"1. Intensify motorcycle checks in {', '.join(all_stations[:3]) or 'hotspot sectors'} between 20:00 - 04:00 hrs.\n"
        f"2. Cross-reference Muddayemal registers for recurring tools and weapon types.\n"
        f"3. Issue automated ANPR alerts if any identified suspect vehicles are detected in city transit rings."
    )

    return "\n".join(briefing)


def search_modus_operandi(
    query: str,
    db: Session,
    top_k: int = 10,
    station_id: Optional[int] = None,
    crime_type: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Execute Modus Operandi (M.O.) vector similarity search."""
    return vector_store.search(
        query_text=query,
        db=db,
        top_k=top_k,
        station_id=station_id,
        crime_type=crime_type,
    )


def ask_intelligence_copilot(
    question: str,
    db: Session,
    history: Optional[List[Dict[str, str]]] = None,
    top_k: int = 6,
) -> Dict[str, Any]:
    """
    RAG Copilot:
    1. Semantically retrieves top matching incidents using vector similarity.
    2. Constructs grounded context from FIRs, suspects, and seized evidence.
    3. Invokes Gemini LLM with automatic model fallback.
    4. Extracts citations and returns actionable intelligence briefing.
    """
    # 1. Retrieve relevant incidents
    retrieved_cases = vector_store.search(query_text=question, db=db, top_k=top_k)

    # 2. Format context
    context_str = format_context_for_llm(retrieved_cases)

    # 3. Call Gemini
    client = get_gemini_client()
    answer_text = None

    if client:
        # Candidate models to try in order of preference
        models_to_try = [
            "models/gemini-3.5-flash-lite",
            settings.GEMINI_CHAT_MODEL or "models/gemini-flash-latest",
            "models/gemini-3.8-flash",
        ]

        user_prompt = f"""Investigating Officer Question:
{question}

---
Verified Police Case Context:
{context_str}
---

Please synthesize a comprehensive Intelligence Briefing answering the question using only the case evidence above.
"""

        for model_candidate in models_to_try:
            try:
                res = client.models.generate_content(
                    model=model_candidate,
                    contents=[
                        {"role": "user", "parts": [{"text": COPILOT_SYSTEM_PROMPT + "\n\n" + user_prompt}]}
                    ],
                )
                if hasattr(res, "text") and res.text:
                    answer_text = res.text.strip()
                    break
            except Exception as e:
                logger.warning(f"Generation failed on {model_candidate}: {e}")

    # Fallback to heuristic police briefing if API did not return text
    if not answer_text:
        answer_text = generate_heuristic_briefing(question, retrieved_cases)

    # Find cited case IDs like [CS-12345] in answer
    cited_ids = list(set(re.findall(r"\[(CS-[A-Za-z0-9]+)\]", answer_text)))

    # Filter retrieved cases to cited ones, or take top 4 if none cited explicitly
    cited_cases = [c for c in retrieved_cases if c["crime_id"] in cited_ids]
    if not cited_cases:
        cited_cases = retrieved_cases[:4]

    # Generate helpful investigative follow-up suggestions
    follow_ups = [
        f"Compare M.O. of {retrieved_cases[0]['crime_id']} with past 6 months",
        "List all seized weapons and vehicles in these cases",
        "Show beat patrol coverage for this jurisdiction",
    ] if retrieved_cases else [
        "Search chain snatching incidents in Dharampeth",
        "Show night burglary patterns involving iron rods",
    ]

    return {
        "question": question,
        "answer": answer_text,
        "cited_cases": cited_cases,
        "total_matches": len(retrieved_cases),
        "suggested_follow_ups": follow_ups,
    }
