#!/usr/bin/env bash
# ==============================================================================
# CrimeSense AI — Unified One-Command Launcher (Linux / macOS)
# ==============================================================================

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Prefer the active global venv if present, otherwise local .venv, otherwise system python3
if [ -f "/home/ritik/.venvs/global/bin/python" ]; then
    PYTHON_BIN="/home/ritik/.venvs/global/bin/python"
elif [ -f "$BACKEND_DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python"
else
    PYTHON_BIN="$(which python3)"
fi

echo "=================================================================="
echo " Starting CrimeSense AI (Nagpur City Police Intelligence Platform)"
echo "=================================================================="
echo "Python Interpreter: $PYTHON_BIN"
echo "Root Directory:     $ROOT_DIR"
echo ""

# 1. Check PostgreSQL Database
echo "==> [1/3] Checking PostgreSQL Database..."
if command -v docker &> /dev/null && [ -f "$ROOT_DIR/docker-compose.yml" ]; then
    if ! nc -z localhost 5432 2>/dev/null; then
        echo "Starting PostgreSQL via Docker Compose..."
        docker compose up -d db || true
        sleep 2
    fi
fi

if nc -z localhost 5432 2>/dev/null || (echo > /dev/tcp/localhost/5432) 2>/dev/null; then
    echo "✓ PostgreSQL is UP and running on port 5432."
else
    echo "⚠️ Warning: PostgreSQL not detected on localhost:5432. Make sure your database is running."
fi

# Function to kill child processes on exit
cleanup() {
    echo ""
    echo "Shutting down CrimeSense AI services..."
    kill $(jobs -p) 2>/dev/null || true
    echo "All services stopped."
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 2. Start FastAPI Backend
echo ""
echo "==> [2/3] Starting FastAPI Backend on http://localhost:8000 ..."
(
    cd "$BACKEND_DIR"
    export PYTHONPATH="."
    "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) &
BACKEND_PID=$!

# Wait for backend to initialize
sleep 2

# 3. Start Vite Frontend
echo ""
echo "==> [3/3] Starting Vite Frontend on http://localhost:5173 ..."
(
    cd "$FRONTEND_DIR"
    npm run dev
) &
FRONTEND_PID=$!

echo ""
echo "=================================================================="
echo " CrimeSense AI is RUNNING!"
echo " 🌐 Custom Portal: http://crimesense.police.local:5173"
echo " 🌐 Standard URL:  http://localhost:5173"
echo " 🚀 Backend Docs:  http://localhost:8000/docs"
echo " 👤 Login:         admin@crimesense.ai  /  Password123!"
echo "=================================================================="
echo "Press Ctrl+C to stop all services."
echo ""

wait
