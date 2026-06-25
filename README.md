# The Interactive Wealth Graph

A high-end, interactive visualization of an ultra-high-net-worth family office's
wealth structure — built as a live visual demo for a premium fintech / family-
office product. Dark-mode, physics-driven, and deployable to Vercel as a static
SPA.

> **Family Office → Legal Entities → Financial Accounts**, modeled on the
> Salentica/Salesforce schema, with a real service seam ready for live data.

## Core features

1. **Physics canvas** — an interactive web of nodes powered by a live
   [`d3-force`](https://github.com/d3/d3-force) simulation. The household is
   pinned at the center; entities and accounts settle onto orbital rings. Drag
   any node and the forces ease it back into place — a fluid, physics-based
   snap-back.
2. **Details panel** — click any node and a glassy panel slides in from the
   right with the entity's AUM, beneficiaries, custodian, lineage, and the
   source SObject API name.
3. **Look-Through Analyzer** — flip the toggle, click an account (e.g. the
   **Alts+ Fund**), and the canvas dims while a bright neon line traces the
   exact lineage **account → trust → family office**.

## Tech stack

| Concern | Choice |
| --- | --- |
| Build | Vite + React 18 + TypeScript |
| Graph / interaction | [`@xyflow/react`](https://reactflow.dev) (React Flow v12) |
| Physics | `d3-force` (charge · link · collide · radial) |
| Animation | Framer Motion |
| State | Zustand |
| Styling | Tailwind CSS + CSS variables (swappable palette) |

## Backend-ready by design

The app **never imports the mock JSON directly**. All data flows through one seam:

```
UI → useWealthData() → wealthService.fetchWealthGraph() → normalize → buildGraph()
```

- [`src/data/familyOffice.json`](src/data/familyOffice.json) is shaped like a
  real **Salesforce REST query response** (`totalSize` / `done` / `records[]`
  with `attributes`), keyed by the SObject API names.
- [`src/services/wealthService.ts`](src/services/wealthService.ts) is the swap
  point. Today it returns the mock (with simulated latency so the loading state
  is real); tomorrow it `fetch()`es a live endpoint. The
  `normalizeSalesforceResponse()` parsing is identical either way.
- **Going live changes only the inside of that one function** — no UI/component
  changes. The planned path: browser → a Vercel serverless `/api/wealth-graph`
  → Salesforce SOQL with server-side OAuth.

Flip it with env vars (see [`.env.example`](.env.example)):

```bash
VITE_USE_MOCK=false
VITE_API_BASE_URL=https://your-app.vercel.app/api
```

## Data model (Salentica / Salesforce)

| SObject API name | Role | Key lookup |
| --- | --- | --- |
| `SalenticaLMNTS__Relationship__c` | Family-office household (root) | — |
| `SalenticaLMNTS__Portfolio__c` | Legal entities (trusts, LLCs) | `SalenticaLMNTS__Relationship__c` |
| `SalenticaLMNTS__FinancialAccount__c` | Accounts & alternatives | `SalenticaLMNTS__Portfolio__c` |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production bundle → dist/
npm run preview    # preview the production build
```

## Deploy to Vercel

Push to a Git repo and import it in Vercel, or:

```bash
npm i -g vercel
vercel
```

Vercel auto-detects Vite (config in [`vercel.json`](vercel.json)). No backend or
environment variables are required for the demo.

## Project structure

```
src/
  config/env.ts             # data-source config (the "go live" switch)
  data/familyOffice.json    # mock data in Salesforce REST envelopes
  types/salesforce.ts       # SObject + envelope + view-model types
  services/wealthService.ts # THE SEAM: fetch + normalize
  lib/buildGraph.ts         # records → nodes/edges; getLineage()
  store/useGraphStore.ts    # selection + look-through state (Zustand)
  hooks/                    # useWealthData, useForceLayout, useNodeStates
  components/               # TopBar, GraphCanvas, DetailsPanel, nodes/, edges/, states/
```
