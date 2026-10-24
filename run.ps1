# -- CrimeSense AI - one-command launcher (Windows / PowerShell) ---------
# Usage:  .\run.ps1            setup (if needed) + start backend & frontend
#         .\run.ps1 -Reset     also wipe and reseed the database
# Or double-click run.bat.

param([switch]$Reset)

$ErrorActionPreference = "Stop"
$Root     = $PSScriptRoot
$Backend  = Join-Path $Root "backend"
$Frontend = Join-Path $Root "frontend"
$VenvPy   = Join-Path $Backend ".venv\Scripts\python.exe"

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Fail($msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; Read-Host "Press Enter to exit"; exit 1 }

# -- 1. Database ----------------------------------------------------------
Step "Checking database"
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Push-Location $Root
    docker compose up -d db
    Pop-Location
}
$pgUp = $false
for ($i = 0; $i -lt 15; $i++) {
    if ((Test-NetConnection localhost -Port 5432 -WarningAction SilentlyContinue).TcpTestSucceeded) { $pgUp = $true; break }
    Start-Sleep -Seconds 2
}
if (-not $pgUp) { Fail "PostgreSQL is not reachable on localhost:5432. Start your PostgreSQL service (or Docker) and retry." }
Write-Host "PostgreSQL is up."

# -- 2. Backend setup -----------------------------------------------------
Step "Preparing backend"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Creating virtual environment..."
    if (Get-Command py -ErrorAction SilentlyContinue) {
        # Prefer 3.12 / 3.11 (ML wheels lag on newer versions)
        try { py -3.12 -m venv (Join-Path $Backend ".venv") } catch { py -3 -m venv (Join-Path $Backend ".venv") }
    } else {
        python -m venv (Join-Path $Backend ".venv")
    }
}
if (-not (Test-Path (Join-Path $Backend ".env"))) {
    Copy-Item (Join-Path $Backend ".env.example") (Join-Path $Backend ".env")
    Write-Host "Created backend\.env from .env.example - set GROQ_API_KEY / SECRET_KEY there." -ForegroundColor Yellow
}

Push-Location $Backend
try {
    & $VenvPy -c "import fastapi, uvicorn, alembic, sklearn, xgboost" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Installing Python dependencies..."
        & $VenvPy -m pip install -r requirements.txt
        if ($LASTEXITCODE -ne 0) { Fail "pip install failed (try Python 3.11/3.12: delete backend\.venv and rerun)." }
    }

    Step "Running migrations"
    & $VenvPy -m alembic upgrade head
    if ($LASTEXITCODE -ne 0) { Fail "alembic upgrade failed - check DATABASE_URL in backend\.env." }

    if (-not (Test-Path (Join-Path $Root "data\nagpur_crime_cache.json"))) {
        Step "Generating Nagpur dataset"
        & $VenvPy -m app.scripts.generate_nagpur_data
        if ($LASTEXITCODE -ne 0) { Fail "dataset generation failed." }
    }

    Step "Seeding database (skips if already seeded)"
    if ($Reset) { & $VenvPy -m app.scripts.seed --reset } else { & $VenvPy -m app.scripts.seed }
    if ($LASTEXITCODE -ne 0) { Fail "seeding failed." }
} finally { Pop-Location }

# -- 3. Frontend setup ----------------------------------------------------
Step "Preparing frontend"
Push-Location $Frontend
try {
    if (-not (Test-Path "node_modules")) {
        npm install
        if ($LASTEXITCODE -ne 0) { Fail "npm install failed." }
    }
    if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
} finally { Pop-Location }

# -- 4. Launch ------------------------------------------------------------
Step "Starting backend and frontend in new windows"
Start-Process powershell -WorkingDirectory $Backend -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle='CrimeSense API'; & '$VenvPy' -m uvicorn app.main:app --reload"
Start-Process powershell -WorkingDirectory $Frontend -ArgumentList "-NoExit", "-Command",
    "`$host.UI.RawUI.WindowTitle='CrimeSense Web'; npm run dev"

Start-Sleep -Seconds 6
Start-Process "http://localhost:5173"

Write-Host "`nCrimeSense AI is running:" -ForegroundColor Green
Write-Host "  App:      http://localhost:5173"
Write-Host "  API docs: http://localhost:8000/docs"
Write-Host "  Login:    admin@crimesense.ai / Password123!"
Write-Host "Close the two server windows to stop the app."
