# Deploying Certuity Prism on Azure

On-brand for Certuity's stack (Azure · Azure SQL · Semantic Kernel · Azure-hosted GPT-4o).

- **Frontend** (Vite/React) → **Azure Static Web Apps** (Free)
- **Backend** (FastAPI + WebSockets) → **Azure Container Apps** (uses `server/Dockerfile`)

Secrets live only in the backend's Azure config — never in the repo, never in the browser.

---

## 0 · Prerequisites

- **Azure account** — students: https://azure.microsoft.com/free/students/ (no card, $100 credit) · or https://azure.microsoft.com/free/
- **Azure CLI** — https://learn.microsoft.com/cli/azure/install-azure-cli-windows
- **GitHub repo** with the latest code pushed (including `server/Dockerfile`).
- A terminal. Commands below are single-line so they paste cleanly into **PowerShell or Git Bash**.

Sign in and register the providers (one-time):

```
az login
az extension add --name containerapp --upgrade
az provider register --namespace Microsoft.App
az provider register --namespace Microsoft.OperationalInsights
```

Pick names once (reuse below): resource group `certuity-prism`, region `eastus`, backend `certuity-prism-api`.

```
az group create --name certuity-prism --location eastus
```

---

## Order of operations (avoids the URL chicken-and-egg)

1. Deploy **backend** → get its `https://…azurecontainerapps.io` URL.
2. Deploy **frontend** with `VITE_AGENT_BASE_URL` = that URL → get the `…azurestaticapps.net` URL.
3. Set backend `ALLOWED_ORIGINS` = the frontend URL.
4. Point **ElevenLabs** at the backend.

---

## 1 · Backend → Azure Container Apps

Build + deploy from the Dockerfile in one command (Azure builds it in the cloud — no local Docker needed). Run from the repo root:

```
az containerapp up -n certuity-prism-api -g certuity-prism -l eastus --environment certuity-env --source ./server --ingress external --target-port 8000
```

Set the non-secret config:

```
az containerapp update -n certuity-prism-api -g certuity-prism --set-env-vars USE_MOCK_LLM=false LLM_PROVIDER=github DATA_SOURCE=json DEMO_CLIENT_ID=a0R8d00000Smith1 AUDIT_LOG_PATH=/tmp/audit.log.jsonl
```

Store the secrets in Container Apps' secret store, then reference them (keys never appear in plain env):

```
az containerapp secret set -n certuity-prism-api -g certuity-prism --secrets github-token=YOUR_GITHUB_MODELS_TOKEN elevenlabs-key=YOUR_ELEVENLABS_API_KEY elevenlabs-agent=YOUR_ELEVENLABS_AGENT_ID
```
```
az containerapp update -n certuity-prism-api -g certuity-prism --set-env-vars GITHUB_MODELS_TOKEN=secretref:github-token ELEVENLABS_API_KEY=secretref:elevenlabs-key ELEVENLABS_AGENT_ID=secretref:elevenlabs-agent
```

Keep one replica warm (no cold start during the demo):

```
az containerapp update -n certuity-prism-api -g certuity-prism --min-replicas 1 --max-replicas 2
```

Get the backend URL (save it — this is your `VITE_AGENT_BASE_URL`):

```
az containerapp show -n certuity-prism-api -g certuity-prism --query properties.configuration.ingress.fqdn -o tsv
```

Verify: open `https://<that-fqdn>/healthz` → `{"ok":true,"mock_llm":false,...}`.
WebSockets work over this HTTPS domain automatically.

Docs: `az containerapp up` https://learn.microsoft.com/azure/container-apps/containerapp-up · secrets https://learn.microsoft.com/azure/container-apps/manage-secrets

---

## 2 · Frontend → Azure Static Web Apps

1. Portal → **Create a resource → Static Web App** (https://portal.azure.com → search "Static Web Apps").
2. **Basics:** resource group `certuity-prism`; name `certuity-prism`; **Plan = Free**; region near you.
3. **Deployment:** Source = **GitHub** → authorize → choose your **org / repo / branch**.
4. **Build details** (Vite):
   - **App location:** `/`
   - **Api location:** *(leave blank)*
   - **Output location:** `dist`
5. **Create.** Azure adds a workflow file to your repo (`.github/workflows/azure-static-web-apps-*.yml`) and builds automatically.

### Inject the backend URL at BUILD time (important)

Static Web Apps "Application settings" are **runtime only** — Vite bakes `VITE_*` at **build** time, so they must be set in the GitHub Actions workflow instead.

a. GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name `VITE_AGENT_BASE_URL`, value = your backend URL from step 1 (e.g. `https://certuity-prism-api.eastus.azurecontainerapps.io`).

b. Edit the generated `.github/workflows/azure-static-web-apps-*.yml`. On the **"Build And Deploy"** step, add an `env:` block:

```yaml
      - name: Build And Deploy
        id: builddeploy
        uses: Azure/static-web-apps-deploy@v1
        env:
          VITE_AGENT_BASE_URL: ${{ secrets.VITE_AGENT_BASE_URL }}
          VITE_USE_MOCK: "true"
        with:
          azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN_XXXX }}
          repo_token: ${{ secrets.GITHUB_TOKEN }}
          action: "upload"
          app_location: "/"
          api_location: ""
          output_location: "dist"
```

Commit → it rebuilds with the URL baked in. Your site URL is on the Static Web App's **Overview** (e.g. `https://certuity-prism.azurestaticapps.net`) — this is the stable link to pull up.

Docs: SWA getting started https://learn.microsoft.com/azure/static-web-apps/getting-started · build config https://learn.microsoft.com/azure/static-web-apps/build-configuration

---

## 3 · Connect the two

**CORS** — tell the backend to trust the frontend (must be exact, no `*`):

```
az containerapp update -n certuity-prism-api -g certuity-prism --set-env-vars ALLOWED_ORIGINS=https://certuity-prism.azurestaticapps.net
```

**ElevenLabs (voice)** — in the ElevenLabs dashboard, on your Conversational AI agent:
- **Custom LLM → Server URL** = `https://<backend-fqdn>/llm/v1`
- Make the agent **public** and add your `azurestaticapps.net` domain to its allowlist.
- Confirm `ELEVENLABS_AGENT_ID` on the backend matches this agent (it's what lights up the mic).

---

## 4 · Smoke test

- Frontend loads, map + data render. ✅
- Type a question in the dock → grounded reply + map moves. ✅ (backend + CORS)
- Mic button visible → talk → spoken answer drives the map. ✅ (ElevenLabs)
- Upload a PDF → screened + summarized; Safeguards panel logs events. ✅
- `https://<backend-fqdn>/healthz` → `mock_llm:false`. ✅

---

## Cost

- Static Web Apps Free: **$0**.
- Container Apps: first 180k vCPU-s + 360k GiB-s/month free; one always-warm small replica runs a bit over that (~$10–15/mo) — **covered by the $100 student credit**. Set `--min-replicas 0` to scale to zero (free, but ~10–30s cold start; warm it before the chat).

## Updating later

- **Backend:** re-run the `az containerapp up …` command (rebuilds + redeploys).
- **Frontend:** just `git push` — the GitHub Action redeploys automatically.
