# CrimeSense AI

**AI-Powered Crime Intelligence & Predictive Analytics Platform for Law Enforcement**

A production-grade, full-stack crime intelligence platform — real-time incident mapping,
predictive hotspot analytics, AI-powered FIR parsing (OCR + LLM), suspect network analysis,
alerting, and ML model management — with role-based access control.

**Jurisdiction: Nagpur, Maharashtra (India)** — Nagpur City Police Commissionerate, 30 police
stations across 5 zones, crime heads under the Bharatiya Nyaya Sanhita (BNS) 2023 and special &
local laws (NDPS, Arms Act, Maharashtra Prohibition / Gambling Acts).

Built with **React + TypeScript + Vite + Tailwind + ShadCN** on the frontend and
**FastAPI + SQLAlchemy 2.0 + PostgreSQL/PostGIS** on the backend, with a
**scikit-learn / XGBoost** ML pipeline, **PyTesseract** OCR and **GROQ (gpt-oss-120b)** parsing.

---

## Architecture

```
CrimeSenseAI-main/
├── docker-compose.yml            # PostgreSQL + PostGIS
├── data/
│   └── nagpur_crime_cache.json   # Nagpur crime dataset (seed source, generated)
│
├── backend/                      # FastAPI service (clean architecture)
│   ├── app/
│   │   ├── main.py               # app assembly (middleware + routers)
│   │   ├── core/                 # config, database, security(JWT), rbac, deps, logging
│   │   ├── models/               # SQLAlchemy 2.0 ORM models (+ PostGIS geometry)
│   │   ├── schemas/              # Pydantic v2 request/response schemas
│   │   ├── repositories/         # repository pattern (data access)
│   │   ├── services/             # service layer (business logic)
│   │   │   └── ml/               # feature engineering + ML pipeline
│   │   ├── api/v1/endpoints/     # REST endpoints (auth, incidents, crimes, alerts,
│   │   │                         #   analytics, models, fir-parser, network)
│   │   └── scripts/              # seed.py, generate_nagpur_data.py, import_cases.py
│   ├── alembic/                  # migrations (PostGIS-enabled initial schema)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/                     # React + TS + Vite SPA
    ├── src/
    │   ├── components/           # ui/ (ShadCN), layout/, charts/, common/
    │   ├── features/             # dashboard, map, fir, records, analytics,
    │   │                         #   hotspots, alerts, network, models, settings, auth
    │   ├── lib/                  # api client (axios+refresh), formatting, utils
    │   ├── store/                # Zustand (auth)
    │   └── types/                # shared API types
    └── .env.example
```

**Patterns:** separated frontend/backend, REST, repository pattern, service-layer pattern,
JWT auth with refresh, RBAC permission matrix, clean layering (API → service → repository → model).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, ShadCN UI, Recharts, React Query, Zustand, React Hook Form, Leaflet |
| Backend | Python, FastAPI, SQLAlchemy 2.0, Alembic, Pydantic v2, JWT |
| Database | PostgreSQL + PostGIS |
| AI | GROQ API (openai/gpt-oss-120b), PyTesseract (OCR) |
| ML | scikit-learn, XGBoost, pandas, NumPy, networkx |
| Dataset | Nagpur City Police (synthetic, statistically modelled) + your own imported cases |

---

## Prerequisites

- **Python 3.11 or 3.12** (recommended — some ML wheels lag on 3.13/3.14)
- **Node.js 18+**
- **Docker** (for PostgreSQL + PostGIS) — or a local PostgreSQL 14+ with PostGIS
- **Tesseract OCR** — required for FIR image/PDF parsing
- **Poppler** — required for PDF → image conversion
- A **GROQ API key** — required for LLM FIR entity extraction (https://console.groq.com)

### Installing Tesseract & Poppler

- **Windows:** install [Tesseract](https://github.com/UB-Mannheim/tesseract/wiki) and
  [Poppler](https://github.com/oschwartz10612/poppler-windows/releases). Set `TESSERACT_CMD`
  and `POPPLER_PATH` in `backend/.env`.
- **macOS:** `brew install tesseract poppler`
- **Linux:** `sudo apt install tesseract-ocr poppler-utils`

---

## Quick Start

### 1. Start the database (PostgreSQL + PostGIS)

```bash
docker compose up -d db
```

This launches `postgis/postgis:16-3.4` on `localhost:5432` with database/user/password
`crimesense` (override via a root `.env` or environment variables).

> No Docker? Install PostgreSQL + PostGIS locally, create a `crimesense` database, and
> point `DATABASE_URL` at it.

### 2. Backend

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate
# Unix:     source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env          # then edit: GROQ_API_KEY, TESSERACT_CMD, SECRET_KEY…

alembic upgrade head          # creates PostGIS extension + all tables (incl. case_files)
python -m app.scripts.generate_nagpur_data   # one-off: builds ../data/nagpur_crime_cache.json
python -m app.scripts.seed    # seeds users, 30 police stations, ~8k incidents, accused, alerts, ML model

uvicorn app.main:app --reload # API at http://localhost:8000  (docs: /docs)
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_BASE_URL defaults to /api/v1 (Vite proxies :8000)
npm run dev                   # app at http://localhost:5173
```

### 4. Log in

The seed creates one demo account per role (password `Password123!` for all):

| Role | Email |
|---|---|
| Admin | `admin@crimesense.ai` |
| Commissioner | `commissioner@crimesense.ai` |
| Commander | `commander@crimesense.ai` |
| Investigator | `investigator@crimesense.ai` |
| Officer | `officer@crimesense.ai` |

---

## Nagpur Data

### Geography
`backend/app/services/area_ref.py` defines the 30 Nagpur City Police stations (with code, zone,
approximate centroid and 3–5 localities each) grouped into 5 zones. In the database,
`community_area` holds the **police station id** and `district` holds the **zone** — the column
names were kept so no schema rewrite was needed. Coordinates are approximate (city-scale
mapping, not dispatch-grade). Maps are centred on Nagpur and use OpenStreetMap tiles.

### Crime heads
`backend/app/services/crime_catalog.py` lists 31 crime heads (MURDER, CHAIN SNATCHING,
HOUSE BREAKING, VEHICLE THEFT, CYBER CRIME, CRUELTY BY HUSBAND, POCSO, NDPS, PROHIBITION…)
with BNS / Act sections, severity (drives the risk score) and sub-types. Loose labels from
imports, the AI FIR parser or old data (e.g. "Burglary", "Mobile snatching", "Narcotics") are
normalised to these heads.

### Seed dataset
Point-level FIR data for Nagpur is not openly published, so the seed data is a **synthetic but
statistically modelled** dataset: 12,000 records (Oct 2024 → Sep 2026) clustered around real
localities, with head-specific time-of-day, festival/summer seasonality and zone patterns,
station-wise FIR numbers (e.g. `SBD/0412/2026`), arrest/closure status, and a pool of accused
persons (habitual offenders, shared MH-31/MH-49/MH-40 vehicles) for the network graph.

```bash
cd backend
python -m app.scripts.generate_nagpur_data                  # default: 12k records up to yesterday
python -m app.scripts.generate_nagpur_data --count 20000 --start 2024-07-01
python -m app.scripts.seed --reset                          # reload the database
```

### Adding real cases
- **New Case form** (Crime Records → *New Case*, or *New Case* in the top bar): crime head with
  BNS section and sub-type chips, FIR number, police station → locality, address, click-to-pin
  map (station auto-filled from the pin), accused persons with vehicles, and file attachments.
- **Bulk import** (Crime Records → *Import*): upload a CSV / Excel FIR register (≤ 5,000 rows).
  Header names are flexible (`Crime Head`/`Offence`, `FIR No`/`Case No`, `Police Station`/`PS`…),
  dates are read day-first, stations resolve by name, code or id, and coordinates are derived
  from the locality/station when absent. Duplicate FIR numbers are skipped and every bad row is
  reported. Download the template from the dialog. Files exported from Crime Records re-import as-is.
  CLI equivalent: `python -m app.scripts.import_cases --file ../data/my_cases.xlsx`
- **AI FIR parsing** now extracts FIR number, police station and sections from Indian FIRs
  (English/Marathi/Hindi) and places the approved case on the Nagpur map.

### Case files (evidence)
Each case has a *Case Files* panel (record detail) for FIR copies, photos, panchnamas, medical
reports, statements, audio/video etc. — categorised, with notes, open-in-browser preview and
download. Files are stored under `backend/uploads/` (`UPLOAD_DIR`, max `MAX_UPLOAD_MB` = 25 MB
each; executables are rejected). Officers and above can upload; deleting files needs Investigator+.

---

## Modules

1. **Command Dashboard** — 6 executive KPIs, crimes-by-category, crime/weekly trends, risk &
   alert-severity distributions, top areas, recent feed, emerging hotspots, patrol recommendations.
2. **Incident Map** — Leaflet map with risk-colored markers, clustering, heatmap layer, and
   crime-type / risk / date filters. Click a marker for details.
3. **FIR OCR & AI Parsing** — upload JPG/PNG/PDF (or paste text) → PyTesseract OCR →
   GROQ (gpt-oss-120b) entity extraction → structured record with per-field confidence, low-confidence
   flagging, generated Crime ID and risk score → approve to create an incident.
4. **Crime Records** — searchable/filterable data grid with pagination, record detail, and
   CSV/Excel export.
5. **Predictive Analytics** — XGBoost hotspot classifier metrics (accuracy/precision/recall/F1),
   crime-volume forecast with confidence bands, weekly forecast, time-of-week heatmap, high-risk-area
   forecasts.
6. **Hotspot Intelligence** — hotspot scoring, heatmap view, top-10 predicted areas, area risk index,
   historical comparison.
7. **Alert Management** — categorized alerts (spike / high-risk / repeat offender / emerging hotspot /
   system), acknowledge / assign / close / notes, severity & trend dashboards.
8. **Suspect Network Analysis** — force-directed graph of suspects / incidents / locations with
   degree centrality, connected components and cluster detection (networkx).
9. **Model Management** — version registry, accuracy/F1 trends, confusion matrix, feature importances,
   retrain / activate / archive.
10. **RBAC** — Admin / Commissioner / Commander / Investigator / Officer with an inherited permission
    matrix enforced on every protected endpoint.

---

## REST API (v1)

Base path: `/api/v1`. Interactive docs at `/docs`.

| Group | Endpoints (selected) |
|---|---|
| `auth` | `POST /login`, `POST /refresh`, `GET /me`, `GET /permissions`, `GET/POST/PATCH /users` |
| `incidents` | `GET /map`, `GET /heatmap`, `GET /{id}`, `GET /{id}/linked`, `GET/POST /{id}/files`, `GET /{id}/files/{file_id}/download`, `DELETE /{id}/files/{file_id}` |
| `reference` | `GET /geography` (stations, zones, localities), `GET /crime-heads` |
| `crimes` | `GET /` (grid; `station`, `district`=zone filters), `GET /types`, `GET /export`, `POST /` (new case), `POST /import`, `GET /import/template`, `PATCH /{id}`, `DELETE /{id}`, `GET /{crime_id}` |
| `alerts` | `GET /`, `GET /dashboard`, `POST /{id}/acknowledge|assign|close|notes` |
| `analytics` | `GET /dashboard`, `GET /hotspots`, `GET /predictive` |
| `models` | `GET /`, `POST /retrain`, `POST /{id}/activate|archive` |
| `fir-parser` | `POST /upload`, `POST /parse-text`, `GET /queue`, `POST /{id}/approve` |
| `network` | `GET /graph` |

All list endpoints support pagination & filtering; writes are permission-guarded.

---

## Production Deployment

- **Backend:** `docker build -t crimesense-api ./backend`. Provide `DATABASE_URL`, `SECRET_KEY`,
  `GROQ_API_KEY`, `BACKEND_CORS_ORIGINS`. Run `alembic upgrade head` on release, then
  `uvicorn app.main:app --host 0.0.0.0 --port 8000` (behind a reverse proxy / multiple workers).
  The backend image bundles `tesseract-ocr` and `poppler-utils`.
- **Frontend:** `npm run build` → static `dist/` served by any CDN/Nginx; point it at the API host.
- **Database:** managed PostgreSQL with the PostGIS extension enabled.
- Set a strong `SECRET_KEY` (`openssl rand -hex 32`), lock down `BACKEND_CORS_ORIGINS`, and set
  `ENVIRONMENT=production`.

---

## Configuration Reference

See `backend/.env.example` and `frontend/.env.example` for all variables (database URL, JWT settings,
GROQ key/model, Tesseract/Poppler paths, seed sample size).
