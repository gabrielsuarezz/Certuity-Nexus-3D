#requires -Version 5.1
<#
  deploy-azure-backend-part2.ps1
  Run this AFTER the GitHub Action has built + pushed the image to GHCR and you've
  set that package's visibility to Public. It reuses the Container Apps environment
  the first script already created, deploys the image, and wires your keys.
#>

$ErrorActionPreference = 'Stop'

$Rg     = 'certuity-prism'
$App    = 'certuity-prism-api'
$AcaEnv = 'certuity-env'
$Image  = 'ghcr.io/gabrielsuarezz/certuity-prism-api:latest'

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root 'server\.env'

# Preflight
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI not found. Refresh PATH or reopen the terminal, then re-run."
}
$raw = (az account show 2>$null | Out-String).Trim()
if (-not $raw) { throw "Not signed in. Run 'az login' first." }
if (-not (Test-Path $EnvFile)) { throw "server/.env not found at $EnvFile" }

# Read server/.env
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

# Create the container app from the public GHCR image (no registry creds needed)
Write-Host "Creating the container app from the GHCR image..." -ForegroundColor Cyan
az containerapp create -g $Rg -n $App --environment $AcaEnv --image $Image `
  --target-port 8000 --ingress external --min-replicas 1 --max-replicas 2
if ($LASTEXITCODE -ne 0) { throw "container app create failed - is the GHCR package pushed AND set to Public?" }

# Push config: secrets into the store, env vars reference them
$secretArgs = @()
$envArgs    = @()
foreach ($k in $envVars.Keys) {
  $v = $envVars[$k]
  if ([string]::IsNullOrWhiteSpace($v)) { continue }
  $sname = ($k.ToLower() -replace '[^a-z0-9-]', '-')
  $secretArgs += "$sname=$v"
  $envArgs    += "$k=secretref:$sname"
}
Write-Host "Storing $($secretArgs.Count) secrets + wiring env vars..." -ForegroundColor Cyan
az containerapp secret set --name $App --resource-group $Rg --secrets $secretArgs | Out-Null
az containerapp update     --name $App --resource-group $Rg --set-env-vars $envArgs | Out-Null

# Report + health check
$fqdn = (az containerapp show --name $App --resource-group $Rg --query properties.configuration.ingress.fqdn -o tsv)
$url  = "https://$fqdn"
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " Backend URL:  $url" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Start-Sleep -Seconds 5
try {
  $h = Invoke-RestMethod "$url/healthz" -TimeoutSec 30
  Write-Host ("healthz -> " + ($h | ConvertTo-Json -Compress)) -ForegroundColor Green
} catch {
  Write-Host "healthz not answering yet - give it a minute, then open $url/healthz" -ForegroundColor Yellow
}
