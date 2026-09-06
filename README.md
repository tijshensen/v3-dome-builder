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

## Follow-ups

Pent/Door polish, full-dome view, BOM export, URL state, offline Three.js, base/pony/door components.
