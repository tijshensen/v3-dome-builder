# Hex 3D edit Worker (`/api/hex-edit`)

Cloudflare Worker for the Hex guide **Edit with Grok** spike (repo `v3-dome-builder`).

Client (`hex/index.html`) POSTs `{ prompt, context, schemaVersion: 1 }` and expects `{ ok: true, override }` or `{ ok: false, error }`. Overrides are allowlisted JSON only; the browser merges them onto authored geometry and stores history in `localStorage` (`hex-3d-overrides-v1`). **No DB.**

## Website steps

1. Deploy this Worker (or paste `worker.js` into a Pages Function).
2. Route **`/api/hex-edit`** → this Worker (Pages `_routes` / Wrangler route).
3. Set secret **`XAI_API_KEY`** (xAI API key).
4. CORS already allows `https://diy-dome-guides.pages.dev` and `http://localhost:*` / `http://127.0.0.1:*`.

## Local QA without Worker

Open Hex with `?mockEdit=1` (or set `localStorage.hex-3d-edit-mock=1`). The client uses a deterministic keyword mock (`taller`, `note: …`, `qty 10`, `red`, `miter 30`, …). Network 404 also falls back to mock.

## Schema (schemaVersion 1 allowlist)

Optional fields: `note`, `qtyLabel`, `dimsLabel`, `labelTexts[]`, `stackCount`, `stackRows`, `scale`, `miterDeg`, `bevelDeg`, `highlightColor` (`#rrggbb`).
