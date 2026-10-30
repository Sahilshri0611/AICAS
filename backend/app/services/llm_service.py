"""
LLM service — parses FIR free text into structured crime entities using the
GROQ API (openai/gpt-oss-120b). Returns extracted fields plus per-field confidence.
Falls back to deterministic rule-based NLP extraction when GROQ_API_KEY is not set.
"""

from __future__ import annotations

import json
import re
from typing import Any

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


def _heuristic_parse(text: str) -> dict[str, Any]:
    """Fallback rule-based forensic parser when LLM key is not configured."""
    extracted: dict[str, Any] = {f: None for f in _FIELDS}
    confidence: dict[str, float] = {f: 0.0 for f in _FIELDS}

    # 1. Crime Type
    upper_text = text.upper()
    for head in sorted(CRIME_HEADS, key=len, reverse=True):
        if head in upper_text or head.replace(" ", "") in upper_text:
            extracted["crime_type"] = head
            confidence["crime_type"] = 0.90
            break
    if not extracted["crime_type"]:
        if "SNATCH" in upper_text:
            extracted["crime_type"] = "CHAIN SNATCHING"
            confidence["crime_type"] = 0.85
        elif "ROB" in upper_text:
            extracted["crime_type"] = "ROBBERY"
            confidence["crime_type"] = 0.85
        elif "MURDER" in upper_text or "KILL" in upper_text:
            extracted["crime_type"] = "MURDER"
            confidence["crime_type"] = 0.90
        elif "ASSAULT" in upper_text or "BEAT" in upper_text:
            extracted["crime_type"] = "ASSAULT"
            confidence["crime_type"] = 0.80
        else:
            extracted["crime_type"] = "THEFT"
            confidence["crime_type"] = 0.70

    # 2. FIR Number
    fir_match = re.search(r'(?:FIR\s*(?:No\.?|Number)?\s*[:\.]?\s*)([A-Z0-9/\-]+)', text, re.IGNORECASE)
    if fir_match:
        extracted["fir_number"] = fir_match.group(1).strip()
        confidence["fir_number"] = 0.92
    else:
        num_slash_year = re.search(r'\b(\d{3,4}/202[4-6])\b', text)
        if num_slash_year:
            extracted["fir_number"] = num_slash_year.group(1)
            confidence["fir_number"] = 0.85

    # 3. Police Station
    from app.services.area_ref import POLICE_STATIONS
    for stn in POLICE_STATIONS.values():
        if re.search(rf'\b{stn.name}\b', text, re.IGNORECASE):
            extracted["police_station"] = stn.name
            confidence["police_station"] = 0.95
            break

    # 4. Sections / Acts
    sec_match = re.search(r'((?:BNS|BNSS|IPC|NDPS|POCSO)\s*[\d\(\),\s/]+)', text, re.IGNORECASE)
    if sec_match:
        extracted["sections"] = sec_match.group(1).strip()
        confidence["sections"] = 0.88

    # 5. Vehicle info
    veh_match = re.search(r'([A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z]{1,2}[-\s]?\d{4})', text)
    if veh_match:
        v_full = veh_match.group(1)
        # Check vehicle model around it
        surrounding = text[max(0, veh_match.start() - 30):min(len(text), veh_match.end() + 30)]
        extracted["vehicle_information"] = surrounding.strip()
        confidence["vehicle_information"] = 0.89

    # 6. Date & Time
    date_match = re.search(r'\b(\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4})\b', text)
    if date_match:
        extracted["date"] = date_match.group(1)
        confidence["date"] = 0.85

    time_match = re.search(r'\b(\d{1,2}[:\.]\d{2})\s*(?:hrs|hours|am|pm)?\b', text, re.IGNORECASE)
    if time_match:
        extracted["time"] = time_match.group(1)
        confidence["time"] = 0.80

    # 7. Location
    loc_match = re.search(r'(?:near|at|in|opposite|behind)\s+([A-Z][a-zA-Z0-9\s,\-]{4,40}?)(?=[,\.\n]|when|where)', text)
    if loc_match:
        extracted["location"] = loc_match.group(1).strip()
        confidence["location"] = 0.75

    # 8. Weapon
    for w in ["knife", "chopper", "gun", "pistol", "revolver", "iron rod", "stick", "blade"]:
        if re.search(rf'\b{w}\b', text, re.IGNORECASE):
            extracted["weapon_information"] = w.capitalize()
            confidence["weapon_information"] = 0.85
            break

    # 9. Summary
    extracted["incident_summary"] = (text[:160] + "...") if len(text) > 160 else text
    confidence["incident_summary"] = 0.80

    return {"extracted": extracted, "field_confidence": confidence}


def parse_fir_text(text: str) -> dict[str, Any]:
    """
    Returns:
      {
        "extracted": {<field>: value},
        "field_confidence": {<field>: 0..1},
      }
    """
    if not settings.GROQ_API_KEY:
        log.info("No GROQ_API_KEY configured — using deterministic forensic heuristic extractor.")
        return _heuristic_parse(text)

    try:
        from groq import Groq
        client = Groq(api_key=settings.GROQ_API_KEY)
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
    except Exception as e:
        log.warning("GROQ parse failed (%s) — falling back to heuristic forensic extractor", e)
        return _heuristic_parse(text)

    field_conf = data.pop("field_confidence", {}) or {}
    extracted = {k: data.get(k) for k in _FIELDS}
    confidence = {}
    for k in _FIELDS:
        c = field_conf.get(k)
        if c is None:
            c = 0.5 if extracted.get(k) else 0.0
        confidence[k] = round(float(c), 3)
    return {"extracted": extracted, "field_confidence": confidence}
