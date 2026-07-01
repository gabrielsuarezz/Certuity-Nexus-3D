#requires -Version 5.1
<#
  deploy-azure-backend-update.ps1
  Re-deploys the backend after a code change. The GitHub Action ("Build backend
  image") rebuilds and pushes a fresh image to GHCR; this script re-syncs every
  key from server/.env into Azure and rolls the container app onto that new image.

  Run it AFTER the GitHub Action has gone green.
#>

$ErrorActionPreference = 'Stop'

$Rg    = 'certuity-prism'
$App   = 'certuity-prism-api'
$Image = 'ghcr.io/gabrielsuarezz/certuity-prism-api:latest'

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root 'server\.env'

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI not found. Refresh PATH or reopen the terminal, then re-run."
}
$raw = (az account show 2>$null | Out-String).Trim()
if (-not $raw) { throw "Not signed in. Run 'az login' first." }
if (-not (Test-Path $EnvFile)) { throw "server/.env not found at $EnvFile" }

# Read server/.env (now including ALPHA_VANTAGE_KEY + TAVILY_API_KEY).
$envVars = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $i = $line.IndexOf('=')
    $k = $line.Substring(0, $i).Trim()
    $v = $line.Substring($i + 1).Trim()
    if ($k) { $envVars[$k] = $v }
  }
}
$envVars['USE_MOCK_LLM']   = 'false'
$envVars['AUDIT_LOG_PATH'] = '/tmp/audit.log.jsonl'
# Keep the deployed Vercel origin trusted (server/.env only lists localhost), so a
# redeploy never regresses CORS for the live site.
$envVars['ALLOWED_ORIGINS'] = 'https://certuity-nexus-3-d.vercel.app,http://localhost:5173,http://127.0.0.1:5173'

$secretArgs = @()
$envArgs    = @()
foreach ($k in $envVars.Keys) {
  $v = $envVars[$k]
  if ([string]::IsNullOrWhiteSpace($v)) { continue }
  $sname = ($k.ToLower() -replace '[^a-z0-9-]', '-')
  $secretArgs += "$sname=$v"
  $envArgs    += "$k=secretref:$sname"
}

Write-Host "Syncing $($secretArgs.Count) secrets..." -ForegroundColor Cyan
az containerapp secret set --name $App --resource-group $Rg --secrets $secretArgs | Out-Null

# A fresh revision suffix guarantees a new revision that re-pulls :latest (the
# image the GitHub Action just built) and applies the env vars.
$suffix = 'v' + (Get-Date -Format 'MMddHHmmss')
Write-Host "Rolling onto the fresh image (revision $suffix)..." -ForegroundColor Cyan
az containerapp update --name $App --resource-group $Rg --image $Image `
  --set-env-vars $envArgs --revision-suffix $suffix
if ($LASTEXITCODE -ne 0) { throw "container app update failed." }

$fqdn = (az containerapp show --name $App --resource-group $Rg --query properties.configuration.ingress.fqdn -o tsv)
$url  = "https://$fqdn"
Write-Host ""
Write-Host "Backend updated: $url" -ForegroundColor Green
Start-Sleep -Seconds 8
try {
  $h = Invoke-RestMethod "$url/healthz" -TimeoutSec 30
  Write-Host ("healthz -> " + ($h | ConvertTo-Json -Compress)) -ForegroundColor Green
} catch {
  Write-Host "healthz not answering yet - give it a minute, then open $url/healthz" -ForegroundColor Yellow
}
