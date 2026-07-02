#requires -Version 5.1
<#
  deploy-azure-backend.ps1
  One-shot deploy of the Certuity Prism backend to Azure Container Apps.

  It reads your keys from server/.env at runtime -they never leave your machine
  except into Azure's encrypted secret store. Re-runnable (idempotent).

  YOU MUST DO THESE ONCE FIRST (they need YOUR Azure identity -a script can't):
    1. Install Azure CLI:
         winget install -e --id Microsoft.AzureCLI
         (or the MSI: https://learn.microsoft.com/cli/azure/install-azure-cli-windows)
       Then close & reopen PowerShell.
    2. az login

  THEN (run from the repo root):
    ./scripts/deploy-azure-backend.ps1
#>

$ErrorActionPreference = 'Stop'

# ---- names you can change ----
$Rg       = 'certuity-prism'
$Location = 'southcentralus'
$App      = 'certuity-prism-api'
$AcaEnv   = 'certuity-env'
# ------------------------------

$Root    = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root 'server\.env'

# 0) Preflight -----------------------------------------------------------------
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
  throw "Azure CLI not found. Install it (winget install -e --id Microsoft.AzureCLI), reopen PowerShell, then re-run."
}
$raw = (az account show 2>$null | Out-String).Trim()
if (-not $raw) { throw "Not signed in to Azure. Run 'az login' first, then re-run." }
$acct = $raw | ConvertFrom-Json
Write-Host "Azure account: $($acct.user.name)  |  subscription: $($acct.name)" -ForegroundColor Cyan
if (-not (Test-Path $EnvFile)) { throw "server/.env not found at $EnvFile" }

# 1) Read server/.env ----------------------------------------------------------
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

# 2) Cloud overrides -----------------------------------------------------------
$envVars['USE_MOCK_LLM']   = 'false'                 # use the real brain + your keys
$envVars['AUDIT_LOG_PATH'] = '/tmp/audit.log.jsonl'  # writable path inside the container
# ALLOWED_ORIGINS stays as-is for now; you set it to the Static Web App URL in Phase 3.

# 3) Azure prep - register providers and WAIT (an unregistered provider is a
#    common cause of the "resource not found" environment error) ----------------
Write-Host "Registering providers (waiting for completion; can take a few minutes)..." -ForegroundColor Cyan
az extension add --name containerapp --upgrade | Out-Null
az provider register --namespace Microsoft.App --wait
az provider register --namespace Microsoft.OperationalInsights --wait
az provider register --namespace Microsoft.ContainerRegistry --wait
az group create --name $Rg --location $Location | Out-Null

# 4) Provision explicitly, step by step. Replaces the flaky all-in-one
#    'az containerapp up' that raced and failed finding the environment. ---------
$Workspace = 'certuity-logs'
$suffix    = ($acct.id -replace '[^0-9a-fA-F]', '').ToLower()
$Acr       = 'certuityprism' + $suffix.Substring(0, 8)   # globally unique + stable per subscription
$Image     = "$Acr.azurecr.io/certuity-prism-api:latest"

Write-Host "[1/4] Creating Log Analytics workspace..." -ForegroundColor Cyan
az monitor log-analytics workspace create -g $Rg -n $Workspace -l $Location | Out-Null
if ($LASTEXITCODE -ne 0) { throw "workspace create failed." }
$wsId  = (az monitor log-analytics workspace show           -g $Rg -n $Workspace --query customerId       -o tsv)
$wsKey = (az monitor log-analytics workspace get-shared-keys -g $Rg -n $Workspace --query primarySharedKey -o tsv)

Write-Host "[2/4] Creating the Container Apps environment (waits until ready)..." -ForegroundColor Cyan
az containerapp env create -g $Rg -n $AcaEnv -l $Location --logs-workspace-id $wsId --logs-workspace-key $wsKey
if ($LASTEXITCODE -ne 0) { throw "environment create failed." }

Write-Host "[3/4] Building the image in the cloud (this takes a few minutes)..." -ForegroundColor Cyan
az acr create -g $Rg -n $Acr --sku Basic --admin-enabled true -l $Location | Out-Null
if ($LASTEXITCODE -ne 0) { throw "acr create failed." }
Push-Location (Join-Path $Root 'server')
try {
  az acr build -r $Acr -t $Image .
  if ($LASTEXITCODE -ne 0) { throw "image build (az acr build) failed - check the pip/Docker output above." }
} finally {
  Pop-Location
}

Write-Host "[4/4] Creating the container app..." -ForegroundColor Cyan
$acrPwd = (az acr credential show -n $Acr --query "passwords[0].value" -o tsv)
az containerapp create -g $Rg -n $App --environment $AcaEnv `
  --image $Image --target-port 8000 --ingress external `
  --registry-server "$Acr.azurecr.io" --registry-username $Acr --registry-password $acrPwd `
  --min-replicas 1 --max-replicas 2
if ($LASTEXITCODE -ne 0) { throw "container app create failed." }

# 5) Push config: every value into the secret store, env vars reference them ----
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

# 7) Report + health check -----------------------------------------------------
$fqdn = az containerapp show --name $App --resource-group $Rg --query properties.configuration.ingress.fqdn -o tsv
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
  Write-Host "healthz not answering yet -the app may still be starting. Open $url/healthz in a minute." -ForegroundColor Yellow
}
Write-Host ""
Write-Host "NEXT:" -ForegroundColor Cyan
Write-Host "  * Phase 2: use this URL as VITE_AGENT_BASE_URL for the Static Web App."
Write-Host "  * Phase 3: once the SWA URL exists, run:"
Write-Host "      az containerapp update -n $App -g $Rg --set-env-vars ALLOWED_ORIGINS=https://YOUR-SWA-URL"
Write-Host "  * Then point the ElevenLabs agent's Server URL at $url/llm/v1"
