/**
 * Trillium 18′ 5/8 3v — locked panel specs (single source of truth).
 * Assembler and shop guides must import from here; do not copy numbers.
 *
 * Chord map (Class I 3v): A≈1155 mm, B≈1130 mm, C≈976 mm
 * Hex = A-A-B · Pent = C-C-B · Door halves replace 2 hex openings (75−2=73).
 */

/** @typedef {'LH' | 'RH'} DoorMirror */

export const VIDEO_URL = 'https://youtu.be/Sl9fEp-27EM';

/** Face topology JSON (3v 5/8) — Assembler loads this; do not regenerate a second map. */
export const PANEL_MAP_URL = new URL('./panel-map-3v-5-8.json', import.meta.url).href;

/** Async loader for the face map (browser / ESM). */
export async function loadPanelMap() {
  const res = await fetch(PANEL_MAP_URL);
  if (!res.ok) throw new Error(`Failed to load panel map: ${res.status}`);
  return res.json();
}

/** Chord labels aligned to Trillium PDF / e042744 */
export const CHORD = {
  A: 1155,
  B: 1130,
  C: 976,
  label: { A: 'A≈1155 mm', B: 'B≈1130 mm', C: 'C≈976 mm' }
};

// --- Shared strut / stock (Hex shop; wood frames approved e042744) ---
export const STRUT_H = 38;       // 1½"
export const STOCK_W = 70;       // 2¾" after rip half of 2×6
export const STRUT_W = 33;       // 1 5/16" finished face (PDF p7)
export const STRUT_H_IN = '1½"';
export const STOCK_W_IN = '2¾"';
export const STRUT_W_IN = '1 5/16"';
export const BEVEL_DEG = 6.5;
export const BEVEL_RAD = (BEVEL_DEG * Math.PI) / 180;
export const BLANK_LEN = 1219;   // ~4' handling blanks
export const BLANK_LEN_IN = "4'-0\"";
export const FULL_2X6_W = 140;   // full 2×6 section before rip (~5½")
export const FULL_2X6_W_IN = '5½"';

/** Locked shop tools (Hex guide machine-setup panel) */
export const TOOL_TABLE_SAW = 'DEWALT DWE7492 table saw';
export const TOOL_MITER_SAW = 'MAKITA LS1019L miter saw';

/**
 * Hex ×73 including 4 windows.
 * Edges a=b=1155 mm, c(base)=1130 mm; miters apex 31.4° bases 29.3°.
 * Locked imperial strings — do not derive via mm→sixteenths.
 */
export const HEX = Object.freeze({
  name: 'Hex',
  type: 'hex',
  qty: 73,
  windows: 4,
  a: 1155,
  b: 1155,
  c: 1130,
  aIn: "3'-9 7/16\"",
  bIn: "3'-9 7/16\"",
  cIn: "3'-8 1/2\"",
  apex: 31.4,
  base: 29.3,
  chord: 'A-A-B',
  note: 'Qty 73 includes 4 windows; replaces classic 75 A-B-A after 2 door cuts'
});

/**
 * Pent ×30 — geometry only (shop polish paused).
 * Edges a=b=976 mm, c=1130 mm; apex 19.3° bases 35.4°.
 * Locked imperial from Trillium PDF p5 (same pattern as HEX).
 */
export const PENT = Object.freeze({
  name: 'Pent',
  type: 'pent',
  qty: 30,
  a: 976,
  b: 976,
  c: 1130,
  aIn: "3'-2 7/16\"",
  bIn: "3'-2 7/16\"",
  cIn: "3'-8 1/2\"", // HEX.cIn / PDF base
  apex: 19.3,
  base: 35.4,
  chord: 'C-C-B',
  note: 'Geometry only; shop-step polish paused until Hex review'
});

/**
 * Door half from Trillium PDF p6 — Special Door Panels (2 mirrored pairs, partial hex).
 * Need 2 LH + 2 RH (mirrored). Use doorHalf('LH'|'RH') or DOOR_LH / DOOR_RH.
 * Locked imperial from PDF; miters numeric (off 90°).
 */
export const DOOR = Object.freeze({
  name: 'Door half',
  type: 'doorHalf',
  qtyLH: 2,
  qtyRH: 2,
  qty: 4,
  a: 986,
  b: 577,
  c: 1130,
  aIn: "3'-2 13/16\"",
  bIn: "1'-10 3/4\"",
  cIn: "3'-8 1/2\"", // HEX.cIn / PDF base
  apex: 1.4,
  baseL: 59.3,
  baseR: 29.3,
  note: '2 LH + 2 RH mirrored pairs; replace 2 hex openings (75−2=73 hex)'
});

/**
 * @param {DoorMirror} side
 * @returns {typeof DOOR & { mirror: DoorMirror, a: number, b: number, aIn: string, bIn: string, baseL: number, baseR: number }}
 */
export function doorHalf(side) {
  if (side !== 'LH' && side !== 'RH') {
    throw new Error(`doorHalf: side must be 'LH' or 'RH', got ${side}`);
  }
  if (side === 'LH') {
    return Object.freeze({
      ...DOOR,
      mirror: 'LH',
      a: DOOR.a,
      b: DOOR.b,
      aIn: DOOR.aIn,
      bIn: DOOR.bIn,
      baseL: DOOR.baseL,
      baseR: DOOR.baseR
    });
  }
  // RH: mirror swaps unequal sides, imperial labels, and base miters
  return Object.freeze({
    ...DOOR,
    mirror: 'RH',
    a: DOOR.b,
    b: DOOR.a,
    aIn: DOOR.bIn,
    bIn: DOOR.aIn,
    baseL: DOOR.baseR,
    baseR: DOOR.baseL
  });
}

export const DOOR_LH = doorHalf('LH');
export const DOOR_RH = doorHalf('RH');

/** Locked plan imperial strings keyed by mm — do not invent fractions */
export const PLAN_IN = new Map([
  [HEX.a, HEX.aIn],
  [HEX.b, HEX.bIn],
  [HEX.c, HEX.cIn],
  [PENT.a, PENT.aIn],
  [PENT.b, PENT.bIn],
  [PENT.c, PENT.cIn],
  [DOOR.a, DOOR.aIn],
  [DOOR.b, DOOR.bIn],
  [DOOR.c, DOOR.cIn],
  [STRUT_H, STRUT_H_IN],
  [STOCK_W, STOCK_W_IN],
  [STRUT_W, STRUT_W_IN],
  [BLANK_LEN, BLANK_LEN_IN],
  [FULL_2X6_W, FULL_2X6_W_IN]
]);

export const META = Object.freeze({
  dome: 'Trillium 5/8 3v',
  size: "18'",
  units: 'mm',
  source: 'Trillium PDF p5–p6 / cross-section p7; Hex wood frames approved e042744; Pent/Door PLAN_IN from PDF',
  counts: { hex: HEX.qty, pent: PENT.qty, doorHalf: DOOR.qty },
  classicBeforeDoors: { hex: 75, pent: 30 }
});

export default {
  META,
  CHORD,
  HEX,
  PENT,
  DOOR,
  DOOR_LH,
  DOOR_RH,
  doorHalf,
  STRUT_H,
  STOCK_W,
  STRUT_W,
  STRUT_H_IN,
  STOCK_W_IN,
  STRUT_W_IN,
  BEVEL_DEG,
  BEVEL_RAD,
  BLANK_LEN,
  BLANK_LEN_IN,
  FULL_2X6_W,
  FULL_2X6_W_IN,
  TOOL_TABLE_SAW,
  TOOL_MITER_SAW,
  PLAN_IN,
  VIDEO_URL,
  PANEL_MAP_URL,
  loadPanelMap
};
