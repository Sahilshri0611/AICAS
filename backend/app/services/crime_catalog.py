"""
Crime-head catalogue for Nagpur / Maharashtra police records.

Crime heads follow NCRB / Maharashtra Police reporting categories. Sections
reference the Bharatiya Nyaya Sanhita, 2023 (BNS — in force from 1 July 2024)
and the special & local laws (SLL) commonly booked in Nagpur.

Each head carries a base severity (0..1) used for risk scoring, plus the
sub-types used for descriptions and by the synthetic data generator.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class CrimeHead:
    name: str
    severity: float
    section: str
    category: str                      # Body / Property / Women & Children / Economic / SLL / Public Order
    subtypes: tuple[str, ...]
    # Generator hints
    frequency: float = 1.0             # relative share of total crime
    arrest_rate: float = 0.4
    domestic_rate: float = 0.0
    night_bias: float = 0.0            # >0 skews toward night hours, <0 toward daytime


CRIME_HEADS: dict[str, CrimeHead] = {h.name: h for h in [
    # ── Offences affecting the human body ──
    CrimeHead("MURDER", 1.00, "BNS 103(1)", "Body",
              ("Murder with sharp weapon", "Murder over property dispute", "Murder over old enmity",
               "Murder in drunken brawl"), 0.8, 0.85, 0.15, 0.5),
    CrimeHead("ATTEMPT TO MURDER", 0.92, "BNS 109", "Body",
              ("Attack with knife", "Attack with sickle", "Assault with iron rod", "Firing incident"),
              1.5, 0.75, 0.1, 0.5),
    CrimeHead("CULPABLE HOMICIDE", 0.90, "BNS 105", "Body",
              ("Death in group clash", "Death after assault"), 0.2, 0.8, 0.1, 0.3),
    CrimeHead("GRIEVOUS HURT", 0.78, "BNS 117(2)", "Body",
              ("Grievous hurt with weapon", "Fracture in assault", "Acid attack"), 2.0, 0.6, 0.2, 0.3),
    CrimeHead("HURT", 0.52, "BNS 115(2)", "Body",
              ("Simple hurt in quarrel", "Road-rage assault", "Neighbourhood dispute",
               "Assault on public servant"), 7.0, 0.55, 0.25, 0.2),
    # ── Women & children ──
    CrimeHead("RAPE", 0.95, "BNS 64", "Women & Children",
              ("Rape on false promise of marriage", "Rape by known person"), 1.0, 0.8, 0.0, 0.2),
    CrimeHead("MOLESTATION", 0.72, "BNS 74", "Women & Children",
              ("Outraging modesty of woman", "Molestation in public transport", "Molestation at workplace"),
              4.0, 0.6, 0.05, 0.0),
    CrimeHead("SEXUAL HARASSMENT", 0.62, "BNS 75", "Women & Children",
              ("Sexual harassment", "Obscene messages", "Stalking of woman (BNS 78)"), 1.5, 0.5, 0.0, 0.0),
    CrimeHead("POCSO", 0.93, "POCSO Act 8/12", "Women & Children",
              ("Sexual assault on minor", "Sexual harassment of minor"), 1.2, 0.8, 0.1, 0.0),
    CrimeHead("KIDNAPPING", 0.88, "BNS 137(2)", "Women & Children",
              ("Kidnapping of minor girl", "Kidnapping of minor boy", "Abduction for ransom (BNS 140)"),
              3.0, 0.5, 0.0, 0.0),
    CrimeHead("CRUELTY BY HUSBAND", 0.68, "BNS 85", "Women & Children",
              ("Cruelty by husband and in-laws", "Dowry harassment", "Mental and physical harassment"),
              3.0, 0.35, 1.0, 0.0),
    CrimeHead("DOWRY DEATH", 0.97, "BNS 80", "Women & Children",
              ("Dowry death", "Abetment of suicide over dowry"), 0.2, 0.85, 1.0, 0.0),
    # ── Property ──
    CrimeHead("DACOITY", 0.90, "BNS 310(2)", "Property",
              ("Dacoity at residence", "Highway dacoity", "Dacoity at petrol pump"), 0.4, 0.6, 0.0, 0.8),
    CrimeHead("ROBBERY", 0.82, "BNS 309(4)", "Property",
              ("Robbery at knifepoint", "Mobile robbery", "Robbery of delivery agent", "Cash robbery"),
              3.0, 0.45, 0.0, 0.6),
    CrimeHead("CHAIN SNATCHING", 0.70, "BNS 304", "Property",
              ("Gold chain snatching", "Mangalsutra snatching", "Mobile snatching"), 4.0, 0.3, 0.0, 0.2),
    CrimeHead("HOUSE BREAKING", 0.66, "BNS 331(4)", "Property",
              ("House breaking by night", "Locked house burglary", "Shop breaking", "Temple theft"),
              8.0, 0.2, 0.0, 0.8),
    CrimeHead("VEHICLE THEFT", 0.46, "BNS 303(2)", "Property",
              ("Two-wheeler theft", "Four-wheeler theft", "Auto-rickshaw theft", "Bicycle theft"),
              14.0, 0.15, 0.0, 0.4),
    CrimeHead("THEFT", 0.40, "BNS 303(2)", "Property",
              ("Mobile phone theft", "Theft in dwelling house (BNS 305)", "Pickpocketing",
               "Theft from shop", "Theft at railway station", "Theft of copper wire"), 18.0, 0.2, 0.0, 0.1),
    CrimeHead("CRIMINAL BREACH OF TRUST", 0.45, "BNS 316", "Economic",
              ("Misappropriation by employee", "Breach of trust by agent"), 1.5, 0.3, 0.0, -0.8),
    # ── Economic / cyber ──
    CrimeHead("CHEATING", 0.40, "BNS 318(4)", "Economic",
              ("Land deal fraud", "Job racket fraud", "Investment fraud", "Fake gold fraud"),
              6.0, 0.25, 0.0, -0.8),
    CrimeHead("CYBER CRIME", 0.44, "IT Act 66C/66D", "Economic",
              ("UPI fraud", "OTP fraud", "Online trading scam", "Sextortion", "Fake KYC update call",
               "Digital arrest scam"), 6.0, 0.1, 0.0, -0.6),
    CrimeHead("EXTORTION", 0.72, "BNS 308", "Economic",
              ("Extortion from trader", "Extortion by gang", "Ransom demand"), 1.0, 0.55, 0.0, 0.0),
    # ── Public order ──
    CrimeHead("RIOTING", 0.74, "BNS 191(2)", "Public Order",
              ("Rioting with deadly weapons", "Group clash", "Clash during procession"), 1.5, 0.7, 0.0, 0.3),
    CrimeHead("CRIMINAL INTIMIDATION", 0.40, "BNS 351(2)", "Public Order",
              ("Threat to kill", "Criminal intimidation over money"), 2.5, 0.4, 0.2, 0.0),
    CrimeHead("CRIMINAL TRESPASS", 0.32, "BNS 329(3)", "Public Order",
              ("Trespass on land", "House trespass"), 1.0, 0.4, 0.0, 0.2),
    CrimeHead("ARSON", 0.86, "BNS 326(g)", "Public Order",
              ("Setting vehicle on fire", "Setting house on fire", "Setting shop on fire"),
              0.5, 0.45, 0.0, 0.7),
    CrimeHead("RASH DRIVING", 0.45, "BNS 281", "Public Order",
              ("Rash driving causing hurt", "Death by negligence (BNS 106(1))", "Hit and run"),
              3.0, 0.6, 0.0, 0.3),
    # ── Special & local laws ──
    CrimeHead("NDPS", 0.55, "NDPS Act 8(c)/20(b)", "SLL",
              ("Possession of ganja", "Possession of MD (mephedrone)", "Brown sugar peddling"),
              2.0, 0.97, 0.0, 0.3),
    CrimeHead("ARMS ACT", 0.72, "Arms Act 4/25", "SLL",
              ("Possession of sword", "Possession of country-made pistol", "Possession of knife"),
              1.5, 0.97, 0.0, 0.5),
    CrimeHead("GAMBLING", 0.18, "Mah. Gambling Act 12(a)", "SLL",
              ("Matka gambling", "Cricket betting", "Card gambling den"), 3.0, 0.98, 0.0, 0.2),
    CrimeHead("PROHIBITION", 0.18, "Mah. Prohibition Act 65(e)", "SLL",
              ("Illicit liquor sale", "Hand-brewed liquor manufacture", "Liquor transport without permit"),
              4.0, 0.98, 0.0, 0.3),
]}

# Loose / Chicago-style / LLM-returned names → canonical head.
ALIASES: dict[str, str] = {
    "HOMICIDE": "MURDER", "KILLING": "MURDER",
    "ATTEMPTED MURDER": "ATTEMPT TO MURDER", "ATTEMPT MURDER": "ATTEMPT TO MURDER",
    "ASSAULT": "HURT", "BATTERY": "HURT", "SIMPLE HURT": "HURT", "VOLUNTARILY CAUSING HURT": "HURT",
    "AGGRAVATED ASSAULT": "GRIEVOUS HURT", "ACID ATTACK": "GRIEVOUS HURT",
    "BURGLARY": "HOUSE BREAKING", "HOUSEBREAKING": "HOUSE BREAKING", "HOUSE BREAK": "HOUSE BREAKING",
    "MOTOR VEHICLE THEFT": "VEHICLE THEFT", "AUTO THEFT": "VEHICLE THEFT", "BIKE THEFT": "VEHICLE THEFT",
    "TWO WHEELER THEFT": "VEHICLE THEFT", "CAR THEFT": "VEHICLE THEFT",
    "SNATCHING": "CHAIN SNATCHING", "MOBILE SNATCHING": "CHAIN SNATCHING",
    "NARCOTICS": "NDPS", "DRUGS": "NDPS", "DRUG TRAFFICKING": "NDPS",
    "WEAPONS VIOLATION": "ARMS ACT", "ARMS": "ARMS ACT",
    "FRAUD": "CHEATING", "DECEPTIVE PRACTICE": "CHEATING", "FORGERY": "CHEATING",
    "ONLINE FRAUD": "CYBER CRIME", "CYBER FRAUD": "CYBER CRIME", "CYBERCRIME": "CYBER CRIME",
    "CRIM SEXUAL ASSAULT": "RAPE", "CRIMINAL SEXUAL ASSAULT": "RAPE", "SEXUAL ASSAULT": "RAPE",
    "OUTRAGING MODESTY": "MOLESTATION", "SEX OFFENSE": "MOLESTATION", "STALKING": "SEXUAL HARASSMENT",
    "EVE TEASING": "SEXUAL HARASSMENT",
    "ABDUCTION": "KIDNAPPING",
    "DOMESTIC VIOLENCE": "CRUELTY BY HUSBAND", "DOWRY HARASSMENT": "CRUELTY BY HUSBAND",
    "CRIMINAL DAMAGE": "CRIMINAL TRESPASS", "MISCHIEF": "CRIMINAL TRESPASS",
    "INTIMIDATION": "CRIMINAL INTIMIDATION", "THREAT": "CRIMINAL INTIMIDATION",
    "RIOT": "RIOTING", "UNLAWFUL ASSEMBLY": "RIOTING",
    "LIQUOR LAW VIOLATION": "PROHIBITION", "ILLICIT LIQUOR": "PROHIBITION",
    "BETTING": "GAMBLING", "MATKA": "GAMBLING",
    "ACCIDENT": "RASH DRIVING", "HIT AND RUN": "RASH DRIVING", "ROAD ACCIDENT": "RASH DRIVING",
    "BREACH OF TRUST": "CRIMINAL BREACH OF TRUST",
    "CHILD SEXUAL ABUSE": "POCSO",
}


def normalize_crime_type(raw: Optional[str]) -> str:
    """Map any user/LLM/CSV crime label onto a canonical head (or keep it, uppercased)."""
    t = " ".join((raw or "").upper().replace("_", " ").replace("-", " ").split())
    if not t:
        return "OTHER OFFENCE"
    if t in CRIME_HEADS:
        return t
    if t in ALIASES:
        return ALIASES[t]
    for head in CRIME_HEADS:          # e.g. "THEFT OF MOBILE" → THEFT, "HOUSE BREAKING BY NIGHT"
        if head in t:
            return head
    for alias, head in ALIASES.items():
        if alias in t:
            return head
    return t


def section_for(crime_type: Optional[str]) -> Optional[str]:
    h = CRIME_HEADS.get(normalize_crime_type(crime_type))
    return h.section if h else None


def catalog_payload() -> list[dict]:
    return [
        {"name": h.name, "section": h.section, "category": h.category,
         "severity": h.severity, "subtypes": list(h.subtypes)}
        for h in sorted(CRIME_HEADS.values(), key=lambda h: (h.category, h.name))
    ]
