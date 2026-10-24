"""
LLM service — parses FIR free text into structured crime entities using the
GROQ API (openai/gpt-oss-120b). Returns extracted fields plus per-field confidence.

Requires GROQ_API_KEY in the backend .env.
"""

from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from app.core.config import settings
from app.core.logging import get_logger
from app.services.crime_catalog import CRIME_HEADS

log = get_logger(__name__)

_FIELDS = [
    "crime_type", "fir_number", "police_station", "sections", "location", "date", "time",
    "suspect_details", "victim_details", "vehicle_information", "weapon_information",
    "incident_summary",
]

_SYSTEM_PROMPT = """You are a forensic FIR (First Information Report) analyst for the Nagpur City \
Police (Maharashtra, India) crime intelligence system. FIRs may be in English, Marathi or \
Hindi (or mixed); always answer in English. Dates in Indian FIRs are day-first (DD/MM/YYYY). \
Extract structured information from the report text.

Return ONLY a JSON object with these exact keys:
- crime_type: the primary crime head in UPPERCASE, chosen from: """ + ", ".join(CRIME_HEADS) + """
- fir_number: the FIR / crime number (e.g. "0412/2025")
- police_station: the police station name (e.g. Sitabuldi, Kotwali, Hudkeshwar)
- sections: the legal sections invoked (e.g. "BNS 303(2), 3(5)" or "IPC 379")
- location: the place of occurrence / address of the incident
- date: incident date (YYYY-MM-DD if determinable, else as written)
- time: incident time (HH:MM 24h if determinable, else as written)
- suspect_details: description of the suspect(s)
- victim_details: description of the victim(s)
- vehicle_information: any vehicle mentioned
- weapon_information: any weapon mentioned
- incident_summary: a concise 1-2 sentence summary
- field_confidence: an object mapping each field above to a confidence score between 0 and 1

Use null for any field not present in the text. Base confidence on how explicitly \
the information appears. Respond with JSON only, no prose."""


def _client():
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY not configured. Set it in the backend .env (see README).",
        )
    try:
        from groq import Groq
    except ImportError:  # pragma: no cover
        raise HTTPException(500, "groq package not installed on the server")
    return Groq(api_key=settings.GROQ_API_KEY)


def parse_fir_text(text: str) -> dict[str, Any]:
    """
    Returns:
      {
        "extracted": {<field>: value},
        "field_confidence": {<field>: 0..1},
      }
    """
    client = _client()
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": f"FIR TEXT:\n\n{text[:6000]}"},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        raw = resp.choices[0].message.content
        data = json.loads(raw)
    except HTTPException:
        raise
    except Exception as e:
        log.exception("GROQ parse failed")
        raise HTTPException(status_code=502, detail=f"LLM parsing failed: {e}")

    field_conf = data.pop("field_confidence", {}) or {}
    extracted = {k: data.get(k) for k in _FIELDS}
    confidence = {}
    for k in _FIELDS:
        c = field_conf.get(k)
        if c is None:
            c = 0.5 if extracted.get(k) else 0.0
        confidence[k] = round(float(c), 3)
    return {"extracted": extracted, "field_confidence": confidence}
