$ErrorActionPreference = "Stop"
$RootDir = $PSScriptRoot
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"
$VenvPython = Join-Path $BackendDir "venv\Scripts\python.exe"

Write-Host "================================================================" -ForegroundColor Cyan
Write-Host " SYNTERGIC TELEMETRY DASHBOARD v2.5 // AUTO-SETUP & LAUNCHER" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan

# 1. Auto-bootstrap Python venv if not present (for fresh git clones)
if (-not (Test-Path $VenvPython)) {
    Write-Host "[1/3] Creando entorno virtual Python en backend\venv..." -ForegroundColor Yellow
    Push-Location $BackendDir
    python -m venv venv
    & $VenvPython -m pip install --upgrade pip
    & $VenvPython -m pip install -r requirements.txt
    Pop-Location
}

# 2. Auto-bootstrap Node modules if not present (for fresh git clones)
if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Write-Host "[2/3] Instalando dependencias de Next.js en frontend\node_modules..." -ForegroundColor Yellow
    Push-Location $FrontendDir
    npm install
    Pop-Location
}

# 3. Launch Backend (Port 8000) & Frontend (Port 3000)
Write-Host "[3/3] Iniciando servidores..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$BackendDir'; & '$VenvPython' -m uvicorn main:app --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$FrontendDir'; npm run dev"

Write-Host "[OK] Backend FastAPI iniciando en: http://localhost:8000" -ForegroundColor Green
Write-Host "[OK] Frontend Next.js iniciando en: http://localhost:3000" -ForegroundColor Green
