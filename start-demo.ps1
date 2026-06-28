# ─────────────────────────────────────────────────────────────────────────────
# Certuity Prism — one-click demo launcher.
# Opens three windows: the agent backend, the ngrok tunnel (permanent domain),
# and the web app. Close the windows to stop everything.
#
# Run it:  right-click this file -> "Run with PowerShell"
#   (or)   powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
# ─────────────────────────────────────────────────────────────────────────────

$root = $PSScriptRoot
Write-Host "Starting Certuity Prism demo..." -ForegroundColor Cyan

# 1) Backend — FastAPI + Semantic Kernel brain (Azure-hosted GPT-4o-mini)
Start-Process powershell -WorkingDirectory "$root\server" -ArgumentList @(
  '-NoExit', '-Command',
  '.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000'
)

# 2) ngrok — public tunnel on the permanent domain the ElevenLabs agent expects
Start-Process powershell -ArgumentList @(
  '-NoExit', '-Command',
  'ngrok http --url=https://defuse-charm-viewpoint.ngrok-free.dev 8000'
)

# 3) Frontend — the 3D wealth map + voice dock
Start-Process powershell -WorkingDirectory "$root" -ArgumentList @(
  '-NoExit', '-Command',
  'npm run dev'
)

Write-Host ""
Write-Host "All three launched in separate windows." -ForegroundColor Green
Write-Host "Wait ~10s, then open the URL the frontend prints (e.g. http://localhost:5173)" -ForegroundColor Yellow
Write-Host "and click the mic to talk to the associate." -ForegroundColor Yellow
