# CrimeSense AI: Complete Command Reference Guide

This document contains all the commands to setup, run, reseed, and test the **CrimeSense AI** platform on Linux, macOS, and Windows.

---

## ⚡ Option 1: One-Command Quick Launch (Recommended)

### On Linux / macOS:
Open a terminal in the project root and run:
```bash
./run.sh
```
*This script automatically checks PostgreSQL, starts the FastAPI backend on port 8000, and launches the Vite frontend on port 5173. Press `Ctrl+C` to stop both.*

### On Windows:
Double-click `run.bat` or run in PowerShell:
```powershell
.\run.ps1
```

---

## 🌐 Custom Police Portal Domain (Hide 'localhost')

Instead of showing `http://localhost:5173` during your presentation, you can run on a realistic government intranet domain:  
👉 **`http://crimesense.police.local:5173`** or **`http://nagpurpolice.internal:5173`**

### One-Time Local Setup:
Run this single command in your Linux/macOS terminal:
```bash
echo "127.0.0.1  crimesense.police.local nagpurpolice.internal" | sudo tee -a /etc/hosts
```
*(On Windows: Add `127.0.0.1 crimesense.police.local nagpurpolice.internal` to `C:\Windows\System32\drivers\etc\hosts`).*

Once added, whenever you run `./run.sh`, you can open **`http://crimesense.police.local:5173`** directly in Chrome or Firefox!

---

## 🛠️ Option 2: Step-by-Step Manual Launch (Individual Terminals)

If you prefer to run the backend and frontend in separate terminals for debugging:

### Step 1: Start PostgreSQL (Terminal 1)
If using Docker:
```bash
cd "/home/ritik/Major Project/AICAS"
docker compose up -d db
```
*If you have a local PostgreSQL service installed:*
```bash
sudo systemctl start postgresql
```
*Verify that PostgreSQL is running on port 5432:*
```bash
nc -zv localhost 5432
```

---

### Step 2: Start the FastAPI Backend (Terminal 2)

```bash
cd "/home/ritik/Major Project/AICAS/backend"

# Run with your virtualenv:
PYTHONPATH=. /home/ritik/.venvs/global/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- **Backend API URL:** `http://localhost:8000`
- **Interactive Swagger Docs:** `http://localhost:8000/docs`
- **Alternative ReDoc:** `http://localhost:8000/redoc`

---

### Step 3: Start the Vite Frontend (Terminal 3)

```bash
cd "/home/ritik/Major Project/AICAS/frontend"

# Launch dev server:
npm run dev
```
- **Frontend Web Application:** `http://localhost:5173`

---

## 🗄️ Database Management & Reseeding Commands

### 1. Run Database Migrations (Alembic)
To apply the latest database schema migrations:
```bash
cd "/home/ritik/Major Project/AICAS/backend"
PYTHONPATH=. /home/ritik/.venvs/global/bin/python -m alembic upgrade head
```

### 2. Reseed & Polish All Demo Data
To re-calibrate all 8,000 incidents, 274 pieces of evidence, 32 threat alerts, 60 beat patrol routes, and 9 ML model versions:
```bash
cd "/home/ritik/Major Project/AICAS/backend"
PYTHONPATH=. /home/ritik/.venvs/global/bin/python app/scripts/reseed_polish.py
```

### 3. Generate Fresh Synthetic Nagpur Crime Dataset (From Scratch)
If you ever want to rebuild the 8,000 incident JSON cache from the BNS crime catalogue:
```bash
cd "/home/ritik/Major Project/AICAS/backend"
PYTHONPATH=. /home/ritik/.venvs/global/bin/python -m app.scripts.generate_nagpur_data
PYTHONPATH=. /home/ritik/.venvs/global/bin/python -m app.scripts.seed --reset
```

---

## 👤 Default Demo Login Credentials

All demo accounts share the same password: **`Password123!`**

| Role | Email | Password | Scope & Department |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@crimesense.ai` | `Password123!` | Full System & Model Retraining |
| **Police Commissioner** | `commissioner@crimesense.ai` | `Password123!` | Citywide Command HQ, Civil Lines |
| **DCP / Commander** | `commander@crimesense.ai` | `Password123!` | Zone 3 (Old City Nagpur) |
| **Police Inspector (PI)** | `investigator@crimesense.ai` | `Password123!` | Crime Branch, Nagpur |
| **Police Sub-Inspector (PSI)** | `officer@crimesense.ai` | `Password123!` | Sitabuldi Police Station |

---

## 🏗️ Production Build & Test Commands

### 1. Build the Frontend SPA
```bash
cd "/home/ritik/Major Project/AICAS/frontend"
npm run build
```
*(Runs TypeScript validation `tsc -b` and builds optimized static assets into `dist/` in ~5 seconds).*

### 2. Test Backend Import Integrity
```bash
cd "/home/ritik/Major Project/AICAS/backend"
/home/ritik/.venvs/global/bin/python -c "import app.main; print('✓ Backend imports cleanly!')"
```

### 3. Verify ML Model Registry
```bash
cd "/home/ritik/Major Project/AICAS/backend"
/home/ritik/.venvs/global/bin/python -c "
from app.core.database import SessionLocal
from app.models.model_registry import MLModel
from sqlalchemy import select

db = SessionLocal()
models = db.scalars(select(MLModel)).all()
print(f'Total Registered Models: {len(models)}')
for m in models:
    print(f' - {m.model_type} ({m.version}): {m.algorithm} [Acc: {m.accuracy}]')
db.close()
"
```

---

## 🔧 Troubleshooting & Common Fixes

### 1. Port 8000 or 5173 Already in Use:
If a previous session was not closed cleanly:
```bash
# Find and kill process on port 8000 (Backend):
fuser -k 8000/tcp 2>/dev/null || true

# Find and kill process on port 5173 (Frontend):
fuser -k 5173/tcp 2>/dev/null || true
```

### 2. PostgreSQL Connection Refused (`localhost:5432`):
Ensure the database container is up:
```bash
cd "/home/ritik/Major Project/AICAS"
docker compose ps
docker compose up -d db
```

### 3. Map Shows "API Key Required" Watermark:
- **Zero-Key Fix (Active by Default):** If no CARTO key is configured, the frontend automatically falls back to OpenStreetMap tiles with dark CSS inversion.
- **Official Key:** Get a free key at [carto.com/basemaps/apikey](https://carto.com/basemaps/apikey) and put it in `frontend/.env`:
  ```bash
  VITE_CARTO_API_KEY=your_key_here
  ```
