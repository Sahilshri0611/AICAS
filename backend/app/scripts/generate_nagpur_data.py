"""
Nagpur crime dataset generator.

Point-level FIR data for Nagpur is not published openly, so the platform ships a
deterministic, statistically realistic synthetic dataset modelled on Nagpur City
Police reporting:

  • 30 police stations across 5 zones, incidents clustered around real localities
  • NCRB-style crime heads with BNS 2023 / special-act sections
  • Head-specific hour-of-day, seasonal (festival / summer) and zone patterns
  • Station-wise FIR numbers (e.g. SBD/0412/2025), arrest & closure status
  • A pool of accused persons incl. habitual offenders and shared vehicles
    (MH-31 / MH-49 / MH-40 registrations) so the suspect network is meaningful

Output: data/nagpur_crime_cache.json (consumed by `app.scripts.seed`).

Run (from backend/):
  python -m app.scripts.generate_nagpur_data
  python -m app.scripts.generate_nagpur_data --count 20000 --start 2024-07-01 --end 2026-09-26
"""

from __future__ import annotations

import argparse
import json
import math
import random
from collections import defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path

from app.core.config import settings
from app.core.logging import get_logger
from app.services.area_ref import POLICE_STATIONS, PoliceStation
from app.services.crime_catalog import CRIME_HEADS, CrimeHead
from app.services.risk import compute_risk_score, risk_level_for

log = get_logger("generate")

# ── Spatial patterns: head-specific multipliers per zone ──
ZONE_BIAS: dict[str, dict[int, float]] = {
    "NDPS": {3: 1.8, 5: 1.6, 4: 1.1},
    "GAMBLING": {3: 1.8, 5: 1.5},
    "PROHIBITION": {3: 1.5, 5: 1.7, 1: 1.2},
    "ARMS ACT": {3: 1.5, 5: 1.4},
    "RIOTING": {3: 1.7, 5: 1.3},
    "CHAIN SNATCHING": {1: 1.6, 4: 1.5, 2: 1.1},
    "VEHICLE THEFT": {2: 1.5, 3: 1.2, 1: 1.1},
    "HOUSE BREAKING": {1: 1.3, 4: 1.4, 5: 1.1},
    "CYBER CRIME": {1: 1.3, 2: 1.3, 4: 1.2},
    "CHEATING": {2: 1.3, 1: 1.2},
    "RASH DRIVING": {1: 1.4, 5: 1.2},
    "DACOITY": {1: 1.4, 5: 1.3},
}

LOCATION_TYPES: dict[str, tuple[str, ...]] = {
    "VEHICLE THEFT": ("Parking Area", "Street", "Outside Residence", "Market", "Hospital Parking",
                      "Railway Station", "Metro Station Parking"),
    "HOUSE BREAKING": ("Residence", "Residence", "Shop", "Temple", "Office", "Godown"),
    "THEFT": ("Market", "Bus Stand", "Railway Station", "Residence", "Shop", "Construction Site",
              "Hospital", "Public Transport"),
    "CHAIN SNATCHING": ("Street", "Morning Walk Route", "Temple Road", "Market", "Garden"),
    "ROBBERY": ("Street", "Highway", "ATM", "Shop", "Open Ground"),
    "DACOITY": ("Residence", "Highway", "Petrol Pump", "Farmhouse"),
    "CYBER CRIME": ("Online",),
    "CHEATING": ("Office", "Residence", "Bank", "Online"),
    "CRIMINAL BREACH OF TRUST": ("Office", "Shop", "Godown"),
    "EXTORTION": ("Shop", "Market", "Office", "Phone Call"),
    "RASH DRIVING": ("Highway", "Ring Road", "Street", "Flyover"),
    "NDPS": ("Street", "Open Ground", "Slum Area", "Paan Shop", "Railway Station"),
    "GAMBLING": ("Residence", "Open Ground", "Slum Area", "Shop"),
    "PROHIBITION": ("Slum Area", "Open Ground", "Highway", "Residence"),
    "ARMS ACT": ("Street", "Open Ground", "Paan Shop", "Bus Stand"),
    "CRUELTY BY HUSBAND": ("Residence",),
    "DOWRY DEATH": ("Residence",),
    "MOLESTATION": ("Street", "Public Transport", "Workplace", "College", "Residence", "Market"),
    "SEXUAL HARASSMENT": ("Online", "Workplace", "College", "Street"),
    "POCSO": ("Residence", "School", "Open Ground"),
    "RAPE": ("Residence", "Hotel/Lodge"),
    "KIDNAPPING": ("Residence", "School", "Street", "Market"),
}
DEFAULT_LOCATIONS = ("Street", "Residence", "Open Ground", "Bar/Restaurant", "Paan Shop", "Market")

LANDMARKS = (
    "Hanuman Mandir", "Water Tank", "Bus Stop", "Bank of Maharashtra", "SBI ATM", "ZP School",
    "Petrol Pump", "Metro Station", "Vegetable Market", "Community Hall", "Buddha Vihar",
    "Gurudwara", "Masjid", "Post Office", "NMC Garden", "Sai Mandir", "Chowk", "Railway Crossing",
    "Govt. Hospital", "Police Chowki",
)

MALE = ("Rahul", "Amit", "Sachin", "Vikas", "Rohit", "Sandeep", "Akash", "Pankaj", "Nitin",
        "Sagar", "Shubham", "Aniket", "Prashant", "Vishal", "Mayur", "Sunil", "Rajesh", "Imran",
        "Salim", "Arif", "Shahrukh", "Javed", "Sameer", "Ravi", "Kunal", "Tushar", "Gaurav",
        "Yogesh", "Mangesh", "Dinesh", "Harish", "Ankit", "Nikhil", "Pravin", "Umesh", "Ganesh",
        "Santosh", "Deepak", "Manoj", "Lokesh", "Raju", "Aditya", "Saurabh", "Vaibhav", "Chetan")
FEMALE = ("Pooja", "Priya", "Sneha", "Kavita", "Sunita", "Anita", "Rekha", "Shabana",
          "Ruksana", "Jyoti", "Manisha", "Seema")
SURNAMES = ("Patil", "Deshmukh", "Wankhede", "Meshram", "Gajbhiye", "Bawankar", "Thakre", "Raut",
            "Bhoyar", "Kale", "Dongre", "Nimje", "Shende", "Khobragade", "Ramteke", "Sheikh", "Khan",
            "Qureshi", "Ansari", "Pathan", "Yadav", "Tiwari", "Mishra", "Shukla", "Gupta", "Jaiswal",
            "Sahu", "Chaudhari", "Bhagat", "Uikey", "Sonkusare", "Tembhurne", "Borkar", "Nagpure",
            "Lanjewar", "Dhoble", "Ingle", "Wagh", "Mohod", "Dhote", "Katre", "Pande", "Kawale")
ALIASES = ("Bunty", "Chhotu", "Golu", "Pintu", "Sonu", "Monu", "Tiger", "Kalia", "Babu", "Lala",
           "Pappu", "Guddu", "Raja", "Bablu", "Sheru", "Tinku", "Chikna", "Langda", "Dada")
VEHICLE_MODELS = ("Honda Activa", "Bajaj Pulsar", "Hero Splendor", "TVS Apache", "Honda Shine",
                  "Yamaha FZ", "Bajaj Auto-rickshaw", "Maruti Swift", "Mahindra Bolero",
                  "Maruti Alto", "Tata Ace")
RTO = ("MH-31", "MH-31", "MH-49", "MH-40")

# Heads whose accused are typically identified / linked in the FIR
SUSPECT_HEADS = {
    "MURDER", "ATTEMPT TO MURDER", "CULPABLE HOMICIDE", "GRIEVOUS HURT", "HURT", "ROBBERY",
    "CHAIN SNATCHING", "HOUSE BREAKING", "VEHICLE THEFT", "THEFT", "DACOITY", "EXTORTION",
    "RIOTING", "NDPS", "ARMS ACT", "GAMBLING", "PROHIBITION", "MOLESTATION", "KIDNAPPING",
    "ARSON", "CRIMINAL INTIMIDATION",
}
# Heads habitual offenders specialise in
HABITUAL_HEADS = ("CHAIN SNATCHING", "HOUSE BREAKING", "VEHICLE THEFT", "ROBBERY", "THEFT", "NDPS")


def _hour_weights(head: CrimeHead) -> list[float]:
    # Base urban curve: quiet 02-06, build through the day, evening peak 18-22
    base = [3, 2, 1.5, 1, 1, 1.2, 2, 3, 4, 5, 6, 6.5, 6.5, 6, 6, 6, 6.5, 7, 8, 8.5, 8, 7, 5.5, 4]
    out = []
    for h, w in enumerate(base):
        night = 1.0 if (h >= 22 or h <= 4) else (0.4 if h in (20, 21, 5) else -0.5)
        out.append(w * math.exp(head.night_bias * night))
    return out


def _season(d: date, head: CrimeHead) -> float:
    m = d.month
    f = 1.0
    if m in (10, 11):                       # Navratri / Diwali — travel, crowds, empty houses
        f *= 1.15 if head.category == "Property" else 1.05
    if m in (4, 5) and head.category in ("Body", "Public Order"):
        f *= 1.12                           # Vidarbha summer
    if m in (7, 8):
        f *= 0.92                           # monsoon dip
    if head.name == "CYBER CRIME":
        f *= 1.0 + 0.25 * ((d - date(2024, 1, 1)).days / 730)   # rising trend
    return f


class Generator:
    def __init__(self, seed: int = 2026):
        self.rng = random.Random(seed)
        self.stations = list(POLICE_STATIONS.values())
        self.heads = list(CRIME_HEADS.values())
        self.hour_w = {h.name: _hour_weights(h) for h in self.heads}
        self._build_offenders()

    # ── Offender pool ──
    def _vehicle(self) -> str:
        r = self.rng
        return (f"{r.choice(VEHICLE_MODELS)} {r.choice(RTO)}-"
                f"{r.choice('ABCDEFGHJKLMNPRSTUVWXYZ')}{r.choice('ABCDEFGHJKLMNPRSTUVWXYZ')}-"
                f"{r.randint(1000, 9999)}")

    def _build_offenders(self) -> None:
        r = self.rng
        self.offenders: list[dict] = []
        gang_vehicles = [self._vehicle() for _ in range(18)]
        for i in range(420):
            female = r.random() < 0.08
            first = r.choice(FEMALE if female else MALE)
            habitual = i < 70
            st = r.choice(self.stations)
            self.offenders.append({
                "key": f"ACC-{i+1:04d}",
                "name": f"{first} {r.choice(SURNAMES)}",
                "alias": r.choice(ALIASES) if (habitual or r.random() < 0.15) else None,
                "gender": "Female" if female else "Male",
                "age": r.randint(19, 52),
                "vehicle": (r.choice(gang_vehicles) if habitual and r.random() < 0.45
                            else self._vehicle() if r.random() < 0.3 else None),
                "habitual": habitual,
                "zone": st.zone,
                "specialty": r.choice(HABITUAL_HEADS),
            })
        self.by_zone: dict[int, list[dict]] = defaultdict(list)
        self.habitual_by: dict[tuple[int, str], list[dict]] = defaultdict(list)
        for o in self.offenders:
            self.by_zone[o["zone"]].append(o)
            if o["habitual"]:
                self.habitual_by[(o["zone"], o["specialty"])].append(o)

    def _pick_suspects(self, head: str, zone: int) -> list[dict]:
        r = self.rng
        pool = self.habitual_by.get((zone, head))
        if pool and r.random() < 0.55:
            chosen = [r.choice(pool)]
        else:
            chosen = [r.choice(self.by_zone[zone] or self.offenders)]
        if head in ("RIOTING", "DACOITY", "ROBBERY", "MURDER") and r.random() < 0.6:
            chosen += r.sample(self.by_zone[zone] or self.offenders, k=r.randint(1, 3))
        uniq = {o["key"]: o for o in chosen}
        return [{k: o[k] for k in ("key", "name", "alias", "gender", "age", "vehicle")}
                for o in uniq.values()]

    # ── Single record ──
    def _pick_head_and_station(self) -> tuple[CrimeHead, PoliceStation]:
        head = self.rng.choices(self.heads, weights=[h.frequency for h in self.heads])[0]
        bias = ZONE_BIAS.get(head.name, {})
        st = self.rng.choices(
            self.stations, weights=[s.weight * bias.get(s.zone, 1.0) for s in self.stations]
        )[0]
        return head, st

    def record(self, day: date, today: date) -> dict:
        r = self.rng
        head, st = self._pick_head_and_station()
        hour = r.choices(range(24), weights=self.hour_w[head.name])[0]
        occurred = datetime(day.year, day.month, day.day, hour, r.choice((0, 5, 10, 15, 20, 30, 40, 45, 50)))

        loc = r.choice(st.localities)
        lat = round(loc.lat + r.gauss(0, 0.0042), 6)
        lon = round(loc.lon + r.gauss(0, 0.0042), 6)
        loc_type = r.choice(LOCATION_TYPES.get(head.name, DEFAULT_LOCATIONS))
        if loc_type in ("Residence", "Outside Residence"):
            address = f"Plot No. {r.randint(1, 250)}, {loc.name}"
        elif loc_type == "Online":
            address = f"Complainant residence, {loc.name}"
        else:
            address = f"Near {r.choice(LANDMARKS)}, {loc.name}"

        subtype = r.choice(head.subtypes)
        domestic = r.random() < head.domestic_rate
        arrest = r.random() < head.arrest_rate
        suspects = self._pick_suspects(head.name, st.zone) if (
            head.name in SUSPECT_HEADS and (arrest or r.random() < 0.25)
        ) else []

        age_days = (today - day).days
        if arrest:
            status = "Closed" if age_days > 60 and r.random() < 0.75 else r.choice(("Under Review", "Assigned"))
        elif age_days > 180:
            status = r.choices(("Closed", "Under Review", "Open"), weights=(0.45, 0.2, 0.35))[0]
        elif age_days > 21:
            status = r.choice(("Open", "Assigned", "Under Review"))
        else:
            status = r.choices(("Open", "Assigned"), weights=(0.7, 0.3))[0]

        risk = compute_risk_score(head.name, domestic=domestic, hour=hour)
        vehicle_note = ""
        if head.name == "VEHICLE THEFT":
            vehicle_note = f" Stolen vehicle: {self._vehicle()}."
        accused_note = (f" Accused {suspects[0]['name']}"
                        f"{' alias ' + suspects[0]['alias'] if suspects[0]['alias'] else ''}"
                        f" {'arrested' if arrest else 'identified'}." if suspects else
                        (" Accused unknown; investigation in progress." if not arrest else ""))

        return {
            "Date": occurred.strftime("%Y-%m-%d %H:%M:%S"),
            "PrimaryType": head.name,
            "Description": f"{subtype} ({head.section})",
            "Section": head.section,
            "LocationType": loc_type,
            "Locality": loc.name,
            "Address": address,
            "StationId": st.id,
            "Station": st.name,
            "StationCode": st.code,
            "Zone": st.zone,
            "Beat": st.id * 10 + r.randint(1, 6),
            "Latitude": lat,
            "Longitude": lon,
            "Arrest": arrest,
            "Domestic": domestic,
            "Hour": hour,
            "DayOfWeek": occurred.strftime("%A"),
            "Month": occurred.month,
            "Year": occurred.year,
            "RiskScore": risk,
            "RiskLevel": risk_level_for(risk).value,
            "Status": status,
            "Summary": f"{subtype} reported at {address} ({st.name} PS).{vehicle_note}{accused_note}",
            "Suspects": suspects,
        }

    def generate(self, count: int, start: date, end: date) -> list[dict]:
        days = (end - start).days + 1
        # Per-day weights: seasonality (avg over heads), gentle upward trend, weekend lift
        weights = []
        for i in range(days):
            d = start + timedelta(days=i)
            w = 1.0 + 0.08 * (i / max(1, days))
            w *= 1.06 if d.weekday() >= 5 else 1.0
            w *= 1.12 if d.month in (10, 11) else 0.93 if d.month in (7, 8) else 1.0
            weights.append(w)
        picks = self.rng.choices(range(days), weights=weights, k=count)
        recs = []
        for i in picks:
            d = start + timedelta(days=i)
            rec = self.record(d, end)
            # head-level seasonality via rejection (keeps totals ≈ count)
            if self.rng.random() > min(1.0, _season(d, CRIME_HEADS[rec["PrimaryType"]]) / 1.2):
                rec = self.record(d, end)
            recs.append(rec)

        # Chronological IDs + station-wise, year-wise FIR numbers
        recs.sort(key=lambda x: x["Date"])
        seq: dict[tuple[str, int], int] = defaultdict(int)
        for rec in recs:
            key = (rec["StationCode"], rec["Year"])
            seq[key] += 1
            rec["FIRNo"] = f"{rec['StationCode']}/{seq[key]:04d}/{rec['Year']}"
        recs.reverse()  # newest first
        for i, rec in enumerate(recs, start=1):
            rec["CrimeID"] = f"CS-{len(recs) - i + 1:05d}"
        return recs


def default_cache_path() -> Path:
    p = Path(settings.DATA_CACHE_PATH)
    if not p.is_absolute():
        p = (Path(__file__).resolve().parents[2] / p).resolve()  # relative to backend/
    return p


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--count", type=int, default=12000)
    ap.add_argument("--start", default="2024-10-01")
    ap.add_argument("--end", default=None, help="default: yesterday")
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--out", default=None)
    args = ap.parse_args()

    start = date.fromisoformat(args.start)
    end = date.fromisoformat(args.end) if args.end else date.today() - timedelta(days=1)
    recs = Generator(args.seed).generate(args.count, start, end)

    out = Path(args.out) if args.out else default_cache_path()
    out.parent.mkdir(parents=True, exist_ok=True)
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(recs, fh, ensure_ascii=False, separators=(",", ":"))
    log.info("Wrote %d Nagpur records (%s to %s) to %s", len(recs), start, end, out)


if __name__ == "__main__":
    main()
