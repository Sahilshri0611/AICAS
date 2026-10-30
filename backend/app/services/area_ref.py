"""
Nagpur City Police reference geography.

The platform's geographic unit is the police station jurisdiction of the
Nagpur City Police Commissionerate (Maharashtra, India). Stations are grouped
into five police zones. In the database:

  • `Incident.community_area` / `Area.community_area` → police station id (1..30)
  • `Incident.district`       / `Area.district`       → zone number (1..5)

Coordinates are approximate station / locality centroids (WGS84) — accurate
enough for city-scale mapping and hotspot analytics, not for dispatch.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Optional

CITY_NAME = "Nagpur"
CITY_CENTER: tuple[float, float] = (21.1458, 79.0882)


@dataclass(frozen=True)
class Locality:
    name: str
    lat: float
    lon: float


@dataclass(frozen=True)
class PoliceStation:
    id: int
    name: str
    code: str
    zone: int
    lat: float
    lon: float
    localities: tuple[Locality, ...] = field(default_factory=tuple)
    # Relative crime-volume weight (commercial/transit hubs are busier)
    weight: float = 1.0


def _L(*items: tuple[str, float, float]) -> tuple[Locality, ...]:
    return tuple(Locality(n, la, lo) for n, la, lo in items)


ZONES: dict[int, str] = {
    1: "Zone 1 (West)",
    2: "Zone 2 (Central-North)",
    3: "Zone 3 (Old City)",
    4: "Zone 4 (South)",
    5: "Zone 5 (East-North)",
}

POLICE_STATIONS: dict[int, PoliceStation] = {s.id: s for s in [
    # ── Zone 1 ──
    PoliceStation(1, "Ambazari", "AMB", 1, 21.1360, 79.0480, _L(
        ("Ambazari Lake", 21.1335, 79.0455), ("Bharat Nagar", 21.1372, 79.0420),
        ("Dharampeth", 21.1400, 79.0650), ("Gandhinagar", 21.1345, 79.0590)), 1.1),
    PoliceStation(2, "Bajaj Nagar", "BJN", 1, 21.1220, 79.0640, _L(
        ("Bajaj Nagar", 21.1215, 79.0640), ("Laxmi Nagar", 21.1170, 79.0610),
        ("Shankar Nagar", 21.1340, 79.0620), ("Abhyankar Nagar", 21.1255, 79.0690)), 0.9),
    PoliceStation(3, "Pratap Nagar", "PTN", 1, 21.1120, 79.0540, _L(
        ("Pratap Nagar", 21.1120, 79.0540), ("Khamla", 21.1030, 79.0610),
        ("Trimurti Nagar", 21.1060, 79.0500), ("Deo Nagar", 21.1100, 79.0650)), 1.0),
    PoliceStation(4, "Sonegaon", "SNG", 1, 21.0920, 79.0580, _L(
        ("Sonegaon", 21.0925, 79.0600), ("Airport Road", 21.0920, 79.0470),
        ("Manish Nagar", 21.0860, 79.0730), ("Chinchbhavan", 21.0780, 79.0600)), 1.0),
    PoliceStation(5, "MIDC", "MIDC", 1, 21.1000, 78.9800, _L(
        ("MIDC Hingna", 21.0970, 78.9800), ("Nildoh", 21.1100, 78.9650),
        ("Digdoh", 21.1080, 78.9850), ("Isasani", 21.0880, 79.0000)), 1.2),
    PoliceStation(6, "Hingna", "HNG", 1, 21.0700, 78.9600, _L(
        ("Hingna Town", 21.0690, 78.9580), ("Wanadongri", 21.0900, 78.9920),
        ("Raipur (Hingna)", 21.0780, 78.9480)), 0.8),
    PoliceStation(7, "Wadi", "WADI", 1, 21.1500, 78.9950, _L(
        ("Wadi", 21.1490, 78.9970), ("Datta Wadi", 21.1420, 79.0050),
        ("Amravati Road", 21.1470, 79.0200)), 0.9),
    # ── Zone 2 ──
    PoliceStation(8, "Sitabuldi", "SBD", 2, 21.1438, 79.0826, _L(
        ("Sitabuldi Main Road", 21.1440, 79.0830), ("Variety Square", 21.1463, 79.0810),
        ("Zero Mile", 21.1497, 79.0806), ("Nagpur Railway Station", 21.1520, 79.0880),
        ("Ramdaspeth", 21.1370, 79.0770)), 1.8),
    PoliceStation(9, "Sadar", "SDR", 2, 21.1620, 79.0790, _L(
        ("Sadar Bazar", 21.1625, 79.0795), ("Civil Lines", 21.1560, 79.0710),
        ("Liberty Square", 21.1640, 79.0770), ("Mohan Nagar", 21.1660, 79.0840)), 1.4),
    PoliceStation(10, "Dhantoli", "DNT", 2, 21.1330, 79.0870, _L(
        ("Dhantoli", 21.1335, 79.0870), ("Congress Nagar", 21.1300, 79.0830),
        ("Rahate Colony", 21.1270, 79.0800), ("Panchsheel Square", 21.1360, 79.0845)), 1.0),
    PoliceStation(11, "Gittikhadan", "GTK", 2, 21.1730, 79.0550, _L(
        ("Gittikhadan", 21.1730, 79.0550), ("Seminary Hills", 21.1650, 79.0600),
        ("Gorewada", 21.1850, 79.0600), ("Katol Road", 21.1760, 79.0500)), 1.0),
    PoliceStation(12, "Mankapur", "MKP", 2, 21.1780, 79.0820, _L(
        ("Mankapur", 21.1790, 79.0830), ("Zingabai Takli", 21.1920, 79.0770),
        ("Koradi Road", 21.1850, 79.0880)), 1.0),
    # ── Zone 3 ──
    PoliceStation(13, "Kotwali", "KTW", 3, 21.1480, 79.1030, _L(
        ("Mahal", 21.1470, 79.1030), ("Chitnis Park", 21.1440, 79.1050),
        ("Budhwar Bazar", 21.1440, 79.1080)), 1.5),
    PoliceStation(14, "Ganeshpeth", "GNP", 3, 21.1400, 79.0960, _L(
        ("Ganeshpeth Bus Stand", 21.1420, 79.0930), ("Cotton Market", 21.1450, 79.0900),
        ("Agyaram Devi Chowk", 21.1390, 79.0980)), 1.5),
    PoliceStation(15, "Tehsil", "THS", 3, 21.1540, 79.1100, _L(
        ("Gandhibagh", 21.1500, 79.1060), ("Timki", 21.1590, 79.1120),
        ("Bhaldarpura", 21.1520, 79.1140)), 1.4),
    PoliceStation(16, "Lakadganj", "LKG", 3, 21.1520, 79.1250, _L(
        ("Itwari", 21.1530, 79.1170), ("Lakadganj", 21.1520, 79.1250),
        ("Wardhaman Nagar", 21.1530, 79.1360), ("Jagnade Chowk", 21.1480, 79.1300)), 1.6),
    PoliceStation(17, "Pachpaoli", "PCP", 3, 21.1620, 79.1170, _L(
        ("Pachpaoli", 21.1620, 79.1170), ("Mominpura", 21.1560, 79.1090),
        ("Kamal Chowk", 21.1640, 79.1130), ("Vaishali Nagar", 21.1680, 79.1230)), 1.3),
    PoliceStation(18, "Shantinagar", "STN", 3, 21.1640, 79.1330, _L(
        ("Shantinagar", 21.1640, 79.1330), ("Telipura", 21.1590, 79.1290),
        ("Bhandewadi", 21.1600, 79.1420)), 1.0),
    # ── Zone 4 ──
    PoliceStation(19, "Ajni", "AJN", 4, 21.1180, 79.0880, _L(
        ("Ajni Square", 21.1190, 79.0870), ("Rameshwari", 21.1110, 79.0890),
        ("Chhatrapati Square", 21.1110, 79.0720), ("Wardha Road", 21.1050, 79.0780)), 1.2),
    PoliceStation(20, "Imamwada", "IMW", 4, 21.1320, 79.0990, _L(
        ("Medical Square", 21.1310, 79.1000), ("Imamwada", 21.1330, 79.0970),
        ("Jatarodi", 21.1280, 79.0950)), 1.0),
    PoliceStation(21, "Sakkardara", "SKD", 4, 21.1230, 79.1140, _L(
        ("Sakkardara Chowk", 21.1230, 79.1140), ("Tukdoji Putla", 21.1190, 79.1140),
        ("Reshimbagh", 21.1300, 79.1120), ("Manewada", 21.1100, 79.1180)), 1.2),
    PoliceStation(22, "Nandanvan", "NDV", 4, 21.1360, 79.1330, _L(
        ("Nandanvan", 21.1360, 79.1330), ("Harpur Nagar", 21.1320, 79.1380),
        ("Darshan Colony", 21.1400, 79.1300)), 1.0),
    PoliceStation(23, "Hudkeshwar", "HDK", 4, 21.0950, 79.1200, _L(
        ("Hudkeshwar", 21.0950, 79.1200), ("Narsala", 21.0900, 79.1300),
        ("Dighori", 21.1150, 79.1350)), 1.1),
    PoliceStation(24, "Beltarodi", "BLT", 4, 21.0720, 79.0880, _L(
        ("Beltarodi", 21.0720, 79.0880), ("Besa", 21.0850, 79.1000),
        ("Pipla", 21.0750, 79.1100)), 0.9),
    # ── Zone 5 ──
    PoliceStation(25, "Kalamna", "KLM", 5, 21.1720, 79.1480, _L(
        ("Kalamna Market", 21.1700, 79.1450), ("Chikhali", 21.1650, 79.1500),
        ("Kalamna Railway Yard", 21.1760, 79.1520)), 1.3),
    PoliceStation(26, "Yashodhara Nagar", "YSN", 5, 21.1780, 79.1270, _L(
        ("Yashodhara Nagar", 21.1780, 79.1270), ("Yadav Nagar", 21.1800, 79.1320),
        ("Vinoba Bhave Nagar", 21.1740, 79.1300)), 1.1),
    PoliceStation(27, "Jaripatka", "JPK", 5, 21.1760, 79.0980, _L(
        ("Jaripatka", 21.1760, 79.0980), ("Nara", 21.1950, 79.1000),
        ("Indora", 21.1700, 79.1050)), 1.1),
    PoliceStation(28, "Kapil Nagar", "KPN", 5, 21.1920, 79.1130, _L(
        ("Kapil Nagar", 21.1920, 79.1130), ("Nari", 21.1860, 79.1180),
        ("Uppalwadi", 21.2050, 79.1150), ("Kamptee Road", 21.1880, 79.1050)), 1.0),
    PoliceStation(29, "Pardi", "PRD", 5, 21.1560, 79.1600, _L(
        ("Pardi", 21.1560, 79.1600), ("Bhandara Road", 21.1550, 79.1650),
        ("Punapur", 21.1600, 79.1700)), 1.0),
    PoliceStation(30, "Wathoda", "WTD", 5, 21.1400, 79.1480, _L(
        ("Wathoda", 21.1400, 79.1480), ("Bidgaon", 21.1330, 79.1600),
        ("Swawalambi Nagar", 21.1450, 79.1520)), 0.9),
]}

STATIONS = POLICE_STATIONS


# ── Lookups (names kept for backwards compatibility with callers) ──
def area_name(station_id: Optional[int]) -> str:
    if station_id is None:
        return "Unknown Station"
    st = POLICE_STATIONS.get(int(station_id))
    return f"{st.name} PS" if st else f"Station {int(station_id)}"


def area_centroid(station_id: Optional[int]) -> Optional[tuple[float, float]]:
    if station_id is None:
        return None
    st = POLICE_STATIONS.get(int(station_id))
    return (st.lat, st.lon) if st else None


def zone_for_station(station_id: Optional[int]) -> Optional[int]:
    st = POLICE_STATIONS.get(int(station_id)) if station_id is not None else None
    return st.zone if st else None


def zone_name(zone: Optional[int]) -> Optional[str]:
    return ZONES.get(int(zone)) if zone is not None else None


def _norm(s: str) -> str:
    return "".join(ch for ch in s.lower() if ch.isalnum())


def find_station(text: Optional[str]) -> Optional[PoliceStation]:
    """Match free text (e.g. 'Sitabuldi Police Station', 'SBD', 'Itwari') to a station."""
    if not text:
        return None
    t = _norm(str(text))
    if not t:
        return None
    for st in POLICE_STATIONS.values():
        if _norm(st.name) == t or st.code.lower() == t:
            return st
    for st in POLICE_STATIONS.values():
        if _norm(st.name) in t:
            return st
    for st in POLICE_STATIONS.values():
        for loc in st.localities:
            if _norm(loc.name) in t:
                return st
    return None


def find_locality(text: Optional[str]) -> Optional[tuple[PoliceStation, Locality]]:
    if not text:
        return None
    t = _norm(str(text))
    best: Optional[tuple[PoliceStation, Locality]] = None
    for st in POLICE_STATIONS.values():
        for loc in st.localities:
            n = _norm(loc.name)
            if n and n in t and (best is None or len(n) > len(_norm(best[1].name))):
                best = (st, loc)
    return best


def nearest_station(lat: float, lon: float) -> PoliceStation:
    """Nearest station by locality/centroid distance (equirectangular approx)."""
    def d(a: float, b: float) -> float:
        x = (lon - b) * math.cos(math.radians((lat + a) / 2))
        return x * x + (lat - a) ** 2

    best, best_d = None, float("inf")
    for st in POLICE_STATIONS.values():
        for la, lo in [(st.lat, st.lon), *((l.lat, l.lon) for l in st.localities)]:
            dd = d(la, lo)
            if dd < best_d:
                best, best_d = st, dd
    return best  # type: ignore[return-value]


# Rough city bounding box — used to sanity-check user-supplied coordinates.
BOUNDS = {"min_lat": 20.95, "max_lat": 21.30, "min_lon": 78.85, "max_lon": 79.30}


def in_city(lat: Optional[float], lon: Optional[float]) -> bool:
    if lat is None or lon is None:
        return False
    return BOUNDS["min_lat"] <= lat <= BOUNDS["max_lat"] and BOUNDS["min_lon"] <= lon <= BOUNDS["max_lon"]


def stations_payload() -> list[dict]:
    return [
        {
            "id": st.id, "name": st.name, "code": st.code,
            "zone": st.zone, "zone_name": ZONES[st.zone],
            "latitude": st.lat, "longitude": st.lon,
            "localities": [{"name": l.name, "latitude": l.lat, "longitude": l.lon} for l in st.localities],
        }
        for st in POLICE_STATIONS.values()
    ]
