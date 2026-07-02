# Certuity Prism

**A voice-driven AI wealth associate.** Certuity Prism pairs an interactive **3D
wealth map** of an ultra-high-net-worth family office with a private **AI
associate you can talk to** — grounded in the client's own data, wrapped in a
visible safety layer, and driving the map in real time.

**▶ Live demo:** https://certuity-nexus-3-d.vercel.app
_(Talk or type. Try: "What is my total AUM?", "How are my alternatives doing?",
"Trace my Alts+ fund", or drop in a PDF to analyze.)_

> Built as an end-to-end product demonstration in a specific stack — **Python ·
> Microsoft Semantic Kernel · Azure-hosted GPT-4o · React** — with the safety
> and compliance layer deliberately foregrounded.

---

## What it does

- **3D wealth map** — the family office, its legal entities, and their financial
  accounts as a living map (React + react-three-fiber), sized and lit by value.
- **Talk to your portfolio** — a private associate (text + live voice) answers
  questions grounded in the client's real holdings and **drives the map as it
  speaks** (focus a node, trace lineage) exactly like a click would.
- **Look-Through Analyzer** — trace any account's ownership lineage back up to
  the family office.
- **Live "at a glance" panel** — total AUM, day change, and an allocation donut
  by asset class, updating with a simulated market feed.
- **Document analysis with guardrails** — upload a statement or capital-call
  notice; its text is screened for hidden/injected instructions **before** it is
  ever summarized, and nothing in it is executed.
- **Human-in-the-loop** — sensitive actions never run automatically; they raise
  an approval the client must confirm.
- **A visible safety layer** — prompt-injection detection, scope/authorization
  checks, PII redaction, and an audit trail — surfaced live in the UI so the
  trust story is demonstrable, not hidden.

## Architecture

**Frontend** (repo root) — React + TypeScript + Vite, react-three-fiber for the
3D map, Zustand for state, Tailwind for styling, ElevenLabs SDK for voice. The
agent drives the map through the same store a user click uses, so spoken and
typed answers manipulate the view identically.

**Backend** (`server/`) — FastAPI + **Microsoft Semantic Kernel**. One brain
wrapped in guardrails: injection check → scope check → tool-calling agent → PII
redaction → audit. Tools cover portfolio Q&A, map control, what-if scenarios,
human-in-the-loop actions, live market data, and web search (untrusted web
results run the same injection shields as uploaded documents).

**Pluggable seams** — the LLM provider (GitHub Models / Azure OpenAI) and the
data source (bundled JSON / live Salesforce over SOQL) are swappable behind
interfaces. The core text demo runs **fully keyless** in mock mode.

**Deployment** — frontend on **Vercel**; backend containerized to **Azure
Container Apps** (image built in GitHub Actions → GHCR). See `DEPLOY-AZURE.md`.

## Tech stack

React · TypeScript · Vite · react-three-fiber / three.js · Zustand · Tailwind ·
Framer Motion · ElevenLabs · Python · FastAPI · Microsoft Semantic Kernel ·
Azure OpenAI / GPT-4o · Salesforce (SOQL)

## Run it locally

**Frontend** (repo root):

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

**Backend** (`server/`, keyless mock mode needs no API keys):

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt
.venv/Scripts/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

By default the frontend talks to the deployed backend; point it at a local one
with `VITE_AGENT_BASE_URL=http://127.0.0.1:8000`.

---

## Author

Created by **Gabriel Suarez** — [gsuar092@fiu.edu](mailto:gsuar092@fiu.edu).

_An independent demonstration project. "Certuity" and related marks belong to
their respective owners; this project is not affiliated with or endorsed by
Certuity._
