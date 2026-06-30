# Deploying Certuity Prism

Two pieces, two hosts:

- **Frontend** (React/Vite) → **Vercel** (static, instant, stable URL).
- **Backend** (FastAPI + WebSockets + voice) → an **always-on host** (Render / Railway / Fly).
  Vercel can't host it — it uses WebSockets and in-memory state.

**Secrets stay private.** Real API keys go into the *backend host's* environment-variable
dashboard (encrypted, server-side). The browser never sees them. Never put a secret in a
`VITE_*` variable — those are baked into the public bundle.

---

## Order of operations (avoids the URL chicken-and-egg)

1. Deploy the **backend** → note its URL, e.g. `https://certuity-prism-api.onrender.com`.
2. Deploy the **frontend** to Vercel with `VITE_AGENT_BASE_URL` = that backend URL → note the
   Vercel URL, e.g. `https://certuity-prism.vercel.app`.
3. Set the backend's `ALLOWED_ORIGINS` = the Vercel URL → redeploy backend.
4. Point the **ElevenLabs** agent at the backend (voice).

---

## 1 · Backend

### Option A — Render (easiest; `render.yaml` is committed)

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo. It reads `render.yaml`.
3. In the service's **Environment**, fill the `sync:false` secrets:
   - `GITHUB_MODELS_TOKEN` — your GitHub Models / fine-grained PAT
   - `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
   - `ALLOWED_ORIGINS` — set after step 2 above (your Vercel URL)
4. Deploy. Verify: open `https://<backend>/healthz` → `{"ok":true,"mock_llm":false,...}`.

> **Cold start:** the `free` plan sleeps after ~15 min idle (~50 s first wake). For a live
> demo, either upgrade the service to **Starter ($7/mo)** to stay warm, or just open the site
> ~2 min before your chat to wake it.

### Option B — Railway or Fly (uses `server/Dockerfile`, stays warm on free credit)

- **Railway:** New Project → Deploy from repo → set **Root Directory = `server`** → add the same
  env vars → deploy. Generate a public domain in Settings.
- **Fly:** `cd server && fly launch` (it detects the Dockerfile) → `fly secrets set GITHUB_MODELS_TOKEN=… ELEVENLABS_API_KEY=… ELEVENLABS_AGENT_ID=… ALLOWED_ORIGINS=…` → `fly deploy`. Set `min_machines_running = 1` to avoid cold starts.

### Backend env vars

| Var | Value | Notes |
|---|---|---|
| `USE_MOCK_LLM` | `false` | real brain (set `true` for keyless) |
| `LLM_PROVIDER` | `github` | free GitHub Models; or `azure` |
| `GITHUB_MODELS_TOKEN` | *secret* | required when provider=github |
| `ELEVENLABS_API_KEY` | *secret* | voice |
| `ELEVENLABS_AGENT_ID` | *secret* | enables the mic button |
| `ALLOWED_ORIGINS` | your Vercel URL | comma-separated; **no `*`** (credentials are on) |
| `DATA_SOURCE` | `json` | or `salesforce` + `SF_CONSUMER_KEY`/`SF_CONSUMER_SECRET`/`SF_INSTANCE_URL` |
| `AZURE_CONTENT_SAFETY_*` | *secret* | optional real Prompt Shields; else local heuristic |

---

## 2 · Frontend (Vercel)

1. Vercel → **New Project** → import the repo (it auto-detects Vite; `vercel.json` is set).
2. **Settings → Environment Variables** (Production):
   - `VITE_AGENT_BASE_URL` = `https://<your-backend>` — **must be https** (an https page
     can't call http/ws — mixed content is blocked).
   - `VITE_USE_MOCK` = `true` — map data from the bundle (instant, reliable). The *agent's*
     data still comes from the backend's `DATA_SOURCE`.
3. Deploy. Rename the project for a tidy URL (e.g. `certuity-prism.vercel.app`). The production
   URL is stable across deploys — that's the link to pull up.

> Changing a Vercel env var requires a **redeploy** to take effect (Vite bakes them at build).

---

## 3 · ElevenLabs (voice)

In the ElevenLabs dashboard, on your Conversational AI agent:

1. **Custom LLM → Server URL** = `https://<your-backend>/llm/v1` (replaces the old ngrok URL).
2. Make the agent **public** (the browser starts it with just the agent id) and add your Vercel
   domain to its **allowlist** if one is set.
3. Confirm `ELEVENLABS_AGENT_ID` on the backend matches this agent — that's what lights up the
   mic button (the frontend reads it from `/api/config`).

---

## Smoke test

- Map + data load (Vercel only). ✅
- Open the dock, type a question → grounded reply + the map moves. ✅ (backend reachable, CORS ok)
- Mic button visible → talk → spoken answer drives the map. ✅ (ElevenLabs wired)
- Upload a PDF → it's screened + summarized; safeguards panel logs events. ✅
- `https://<backend>/healthz` shows `mock_llm:false`. ✅
