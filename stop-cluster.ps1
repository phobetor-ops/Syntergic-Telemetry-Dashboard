Write-Host "Deteniendo Syntergic Telemetry Dashboard (Puertos 8000 y 3000)..." -ForegroundColor Yellow

$ports = @(8000, 3000)
foreach ($port in $ports) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pids) {
            try {
                Stop-Process -Id $procId -Force -ErrorAction Stop
                Write-Host "[OK] Proceso en puerto $port (PID: $procId) detenido." -ForegroundColor Green
            } catch {
                Write-Host "[WARN] No se pudo detener el PID $procId en el puerto $port." -ForegroundColor Red
            }
        }
    } else {
        Write-Host "[INFO] Ningún servidor activo en el puerto $port." -ForegroundColor Gray
    }
}

Write-Host "Cluster detenido correctamente." -ForegroundColor Cyan
