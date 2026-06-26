# Certuity Prism — Agent Backend

Python · FastAPI · **Semantic Kernel** · Azure OpenAI · Azure AI Content Safety (Prompt Shields) ·
ElevenLabs Conversational AI. This is the "24/7 private associate" brain behind the 3D wealth map.

## Run (mock mode — no keys needed)
```bash
cd server
python -m venv .venv
.venv/Scripts/pip install -r requirements.txt      # macOS/Linux: .venv/bin/pip
cp .env.example .env                                # USE_MOCK_LLM=true by default
.venv/Scripts/python -m uvicorn app.main:app --port 8000 --reload
```
Then run the frontend (`npm run dev` in the repo root). The Agent dock connects to
`http://127.0.0.1:8000` and works fully in text mode: portfolio Q&A, driving the 3D map,
human-in-the-loop approvals, and the safety guardrails — all with **no API keys**.

```bash
.venv/Scripts/python -m pytest -q        # 6 guardrail/behaviour tests
```

## Go live (the real coffee-chat demo)
In `server/.env`:
1. **Agent brain (Azure OpenAI):** `USE_MOCK_LLM=false`, set `AZURE_OPENAI_ENDPOINT`,
   `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_DEPLOYMENT` (e.g. `gpt-4o`). Now `/ws/agent` runs the
   real **Semantic Kernel** agent (auto tool-calling over the portfolio plugins).
2. **Guardrails (Prompt Shields):** set `AZURE_CONTENT_SAFETY_ENDPOINT` + `_KEY`. Without them a
   local heuristic injection detector is used.
3. **Voice (ElevenLabs Conversational AI):**
   - Expose the backend publicly (e.g. `ngrok http 8000`) so ElevenLabs can reach it.
   - In the ElevenLabs dashboard, create an Agent:
     - **Custom LLM** → `https://<public>/llm/v1/chat/completions` (guardrailed Azure OpenAI proxy).
     - **System prompt** → paste `app/sk/persona.py`.
     - **Client tools** (run in the browser, registered by the app): `focus_holding{query}`,
       `trace_lineage{query}`, `set_look_through{on}`, `show_overview`, `request_approval{kind,details}`.
     - **Server tools** (webhooks → this backend): `POST /tools/get_summary`, `/get_exposure`,
       `/get_performance`, `/list_accounts`, `/get_account{name}`, `/trace_lineage{name}`.
   - Put the agent id in `ELEVENLABS_AGENT_ID` (+ `ELEVENLABS_API_KEY`). The dock's mic activates.

## Safety (built in)
- **Prompt-injection defense** — Azure Prompt Shields (heuristic fallback) on every input.
- **Least privilege** — repository is scoped to a single client; read tools auto-run, actions don't.
- **Human-in-the-loop** — `request_action` never executes; it raises an on-screen approval.
- **PII redaction + scope policy** — masks numbers, defers tax/legal/buy-sell advice to the advisor.
- **Audit trail** — every turn/tool/approval logged (redacted) to `audit.log.jsonl`.

## Key endpoints
`GET /healthz` · `GET /api/config` · `GET /api/wealth-graph` (serves the portfolio) ·
`WS /ws/agent` (text chat) · `POST /llm/v1/chat/completions` (ElevenLabs custom LLM) ·
`POST /tools/*` (server tools) · `POST /approvals/{id}/approve|decline`.

## Data
`app/data/familyOffice.json` (Salentica-shaped) via `app/data/repository.py`. The
`WealthRepository` interface is the seam to **SS&C Black Diamond / Salentica / Azure SQL**.
