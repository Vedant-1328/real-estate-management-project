# Put your app online for free — no credit card.
# Requires: Node.js, MySQL running locally, cloudflared installed.
# Install cloudflared: winget install Cloudflare.cloudflared

$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

Write-Host "`n=== SHREE SAI EARTH MOVERS — public tunnel ===" -ForegroundColor Cyan

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host "cloudflared not found. Install with:" -ForegroundColor Yellow
  Write-Host "  winget install Cloudflare.cloudflared" -ForegroundColor White
  exit 1
}

Write-Host "Building frontend..." -ForegroundColor Gray
Push-Location (Join-Path $Root 'frontend')
$env:VITE_API_BASE_URL = '/api'
npm run build
Pop-Location

Write-Host "Starting production API on port 3000..." -ForegroundColor Gray
Push-Location (Join-Path $Root 'backend')
$env:NODE_ENV = 'production'
if (-not $env:FRONTEND_URL) {
  $env:FRONTEND_URL = 'http://localhost:3000'
}

$backend = Start-Process -FilePath 'node' -ArgumentList 'server.js' -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "`nOpening public HTTPS tunnel (free, no account)..." -ForegroundColor Green
Write-Host "Share the https://....trycloudflare.com URL with your team." -ForegroundColor Green
Write-Host "Keep this window open. Press Ctrl+C to stop.`n" -ForegroundColor Yellow

try {
  cloudflared tunnel --url http://localhost:3000
}
finally {
  if ($backend -and -not $backend.HasExited) {
    Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  }
  Pop-Location
}
