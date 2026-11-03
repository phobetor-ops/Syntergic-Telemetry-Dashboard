#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "================================================================"
echo " SYNTERGIC TELEMETRY DASHBOARD v2.5 // LINUX & MACOS LAUNCHER"
echo "================================================================"

if [ ! -d "$BACKEND_DIR/venv" ]; then
  echo "[1/3] Creating Python virtual environment in backend/venv..."
  python3 -m venv "$BACKEND_DIR/venv"
  "$BACKEND_DIR/venv/bin/pip" install --upgrade pip
  "$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "[2/3] Installing frontend npm dependencies..."
  (cd "$FRONTEND_DIR" && npm install)
fi

echo "[3/3] Starting FastAPI Backend (port 8000) and Next.js Frontend (port 3000)..."
trap 'kill 0' SIGINT
(cd "$BACKEND_DIR" && "$BACKEND_DIR/venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 8000) &
(cd "$FRONTEND_DIR" && npm run dev) &
wait
