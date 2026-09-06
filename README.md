# Trillium 5/8 3v — Hex panel frame builder

Interactive Three.js shop guide for **Hex ×73** panel frames (Trillium 18′ 5/8 3v).

## What it is

- Dark shop UI + orbit viewer
- **10-step** Hex build sequence
- Locked dims (PDF p5 / cross-section p7): sides `3'-9 7/16"` (1155 mm), base `3'-8 1/2"` (1130 mm); miters 31.4° / 29.3°; stock 38×70 → finished 38×33 + 6.5° bevel
- **in / mm** toggle on dims, step text, cut counts, and 3D labels
- Qty: **73 including 4 windows**
- Shop tools named in steps: **DEWALT DWE7492** (rips / 6.5° bevel) and **MAKITA LS1019L** (miters / compound ears)

Steps follow [this video](https://youtu.be/Sl9fEp-27EM) + Trillium plan numbers. Pent/Door paused until Hex review.

## How to run

ES modules need a local server:

```bash
npx serve .
```

## Assembly data

Locked panel constants and 3v 5/8 face topology for the Assembler (Dome - Assembler):

| Path | Purpose |
|------|---------|
| [`panel/panel-specs.js`](panel/panel-specs.js) | **Single source of truth** for HEX / PENT / DOOR dims, counts, miters, strut stock |
| [`panel/panel-map-3v-5-8.json`](panel/panel-map-3v-5-8.json) | Generated face topology (vertices, edges, neighbors, hex/pent/doorHalf) |

Assembler must import specs — do **not** copy numbers:

```js
import {
  HEX, PENT, DOOR, DOOR_LH, DOOR_RH, doorHalf,
  CHORD, META, STRUT_H, STRUT_W, STOCK_W, BEVEL_DEG,
  PLAN_IN, PANEL_MAP_URL, loadPanelMap
} from './panel/panel-specs.js';

const map = await loadPanelMap(); // or fetch(PANEL_MAP_URL)
```

- Face map: Class I frequency-3 geodesic, Z-up, 5/8 truncate (`centroid_z >= -0.25·R`), scaled so B≈1130 mm. Classic 75 hex + 30 pent → after door cuts **73 hex + 30 pent + 4 doorHalf**. Window IDs are heuristic; PDF section labels not mapped.
- Regenerate map: `python3 scripts/generate_panel_map.py`
- Hex shop guide (`index.html`) imports specs only — fabrication UX frozen.


## Assembly guide (Milestone 1)

Interactive **full panel-shell** viewer (hex + pent + doorHalf + windows). Separate from Hex fabrication.

```bash
npx serve .
```

Open [`assembly.html`](assembly.html).

| Path | Purpose |
|------|---------|
| [`assembly.html`](assembly.html) | Assembly UI shell |
| [`assembly/assembly.js`](assembly/assembly.js) | Three.js viewer + sequence |
| [`assembly/assembly.css`](assembly/assembly.css) | Dark shop styles |

- Imports dims/counts from [`panel/panel-specs.js`](panel/panel-specs.js); loads topology via `loadPanelMap()` — no duplicated dim tables.
- Map is **Z-up**; display converts to Three.js **Y-up** with `(x,y,z)->(x,z,-y)`.
- **doorHalf** LH/RH placed from TPM-approved map edges (DOOR a/b/c).
- Window face ids are **provisional** (PDF section labels not mapped).
- Sequence: overview -> apex/crown -> ring-by-ring -> door halves -> windows -> fit-check.
- Hex shop fabrication steps remain in [`index.html`](index.html).



## Wood deck guide (girders + site layout)

Interactive **20′ Trillium wood deck** shop guide for the **18′ 5/8 3v** dome (nearest PDF diameter — locked plan numbers, no 18′ interpolation). Milestone: girders cut complete + site layout with PDF p6/p8 cites.

```bash
npx serve .
```

Open [`deck/index.html`](deck/index.html) (or `/deck/?step=0`).

| Path | Purpose |
|------|---------|
| [`deck/deck-specs.js`](deck/deck-specs.js) | **Single source of truth** — 20′ Component Dimensions, Girder Layout - 20′, materials, tools |
| [`deck/index.html`](deck/index.html) | **13 steps** + Machine setup + cut list + in/mm · materials LEFT / machine RIGHT on saw steps |

- UI label (exact): **20′ deck plan · for 18′ 5/8 3v dome**
- **13 steps** (nav `N / 13`): shop cuts → assemble/lag on site (p8/p9) → layout checks (p6) → posts/strap → framing → subfloor
- Build Notes (PDF p9) sequence: lag-fasten girders on site → confirm diagonal → align to center → mark posts → move aside → set posts → remount/strap
- Cuts: joists (square); rim / outer+inner blocks @ 12° L-L; outer girders @ 18° L-L; inner girders @ 30° L-L
- Machines (written setup; visual polish deferred): **MAKITA LS1019L** primary for angled/cross cuts; circular saw OK for square joists; DEWALT DWE7492 optional
- Source: Trillium Dome & Yurt Wood Deck PDF (personal use) — do **not** commit the PDF into this repo
- Hex fab (`index.html`) and assembly remain separate

## Follow-ups

Pent/Door polish, full-dome view, BOM export, URL state, offline Three.js, base/pony/door components.
