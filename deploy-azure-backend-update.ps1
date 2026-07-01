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

# Resolve :latest to an immutable digest so Azure pulls the FRESHLY-built image.
# Azure Container Apps caches the :latest tag and won't re-pull it on its own,
# silently leaving the old image running. Falls back to the tag if lookup fails.
$ImageRef = $Image
try {
  $tok = (Invoke-RestMethod "https://ghcr.io/token?scope=repository:gabrielsuarezz/certuity-prism-api:pull&service=ghcr.io").token
  $mh = @{
    Authorization = "Bearer $tok"
    Accept        = "application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.v2+json,application/vnd.docker.distribution.manifest.list.v2+json"
  }
  $resp = Invoke-WebRequest -Method Get -Uri "https://ghcr.io/v2/gabrielsuarezz/certuity-prism-api/manifests/latest" -Headers $mh -UseBasicParsing
  $digest = $resp.Headers["Docker-Content-Digest"]
  if ($digest -is [array]) { $digest = $digest[0] }
  if ($digest) { $ImageRef = "ghcr.io/gabrielsuarezz/certuity-prism-api@$digest" }
} catch {
  Write-Host "(Couldn't resolve image digest; falling back to :latest.)" -ForegroundColor Yellow
}

$suffix = 'v' + (Get-Date -Format 'MMddHHmmss')
Write-Host "Rolling onto image (revision $suffix):" -ForegroundColor Cyan
Write-Host "  $ImageRef" -ForegroundColor DarkGray
az containerapp update --name $App --resource-group $Rg --image $ImageRef `
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
