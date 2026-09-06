/**
 * Trillium wood deck — locked 20′ plan specs (single source of truth).
 * Nearest PDF size for the 18′ 5/8 3v dome. Do not invent 18′ interpolations.
 * Component Dimensions table = hard locks; layout dims from PDF Girder Layout - 20′.
 *
 * Personal-use plans (Golden Trillium Geodesics LLC) — encode dimensions accurately;
 * do not redistribute the full PDF in this repo.
 */

export const VIDEO_URL = 'https://youtu.be/Sl9fEp-27EM';

/** Locked shop tools (match Hex fab machine-setup pattern) */
export const TOOL_TABLE_SAW = 'DEWALT DWE7492 table saw';
export const TOOL_MITER_SAW = 'MAKITA LS1019L miter saw';
export const TOOL_CIRCULAR = 'Circular saw (PDF tools list)';

/**
 * TPM UI label — use exactly in banner / META.
 * Nearest PDF diameter for the 18′ dome build.
 */
export const DECK_LABEL = "20′ deck plan · for 18′ 5/8 3v dome";

/** Plan diameter selected from Trillium PDF (15′ / 20′ / 23′) */
export const PLAN_DIAMETER_FT = 20;
export const DOME_SIZE = "18'";
export const AREA_SQ_FT = 291;

/**
 * Locked Component Dimensions — 20′ diameter deck (PDF Component Dimensions).
 * mm rounded from locked PLAN imperial; imperial strings are authoritative.
 */
export const JOIST = Object.freeze({
  id: 'joist',
  name: 'Joist',
  qty: 15,
  lenMm: 2845,
  lenIn: "9'-4\"",
  angleDeg: null,
  note: 'Square ends; stock from 2×6×10′'
});

export const RIM = Object.freeze({
  id: 'rim',
  name: 'Rim',
  qty: 15,
  lenMm: 1238,
  lenIn: "4'-0 3/4\"",
  angleDeg: 12,
  measure: 'long to long',
  note: '12° both ends, long-to-long'
});

export const OUTER_BLOCK = Object.freeze({
  id: 'outerBlock',
  name: 'Outer block',
  qty: 15,
  lenMm: 986,
  lenIn: "3'-2 13/16\"",
  angleDeg: 12,
  measure: 'long to long',
  note: '12° both ends, long-to-long'
});

export const INNER_BLOCK = Object.freeze({
  id: 'innerBlock',
  name: 'Inner block',
  qty: 15,
  lenMm: 373,
  lenIn: "1'-2 11/16\"",
  angleDeg: 12,
  measure: 'long to long',
  note: '12° both ends, long-to-long'
});

export const OUTER_GIRDER = Object.freeze({
  id: 'outerGirder',
  name: 'Outer girder',
  qty: 5,
  lenMm: 3466,
  lenIn: "11'-4 7/16\"",
  angleDeg: 18,
  measure: 'long to long',
  stock: '4×6×12′',
  note: '18° both ends, long-to-long; prefer LS1019L'
});

export const INNER_GIRDER = Object.freeze({
  id: 'innerGirder',
  name: 'Inner girder',
  qty: 3,
  lenMm: 745,
  lenIn: "2'-5 5/16\"",
  angleDeg: 30,
  measure: 'long to long',
  stock: '4×6×8′',
  note: '30° both ends, long-to-long; prefer LS1019L'
});

export const COMPONENTS = Object.freeze([
  JOIST,
  RIM,
  OUTER_BLOCK,
  INNER_BLOCK,
  OUTER_GIRDER,
  INNER_GIRDER
]);

/**
 * Girder Layout — 20′ (PDF page “Girder Layout - 20′”).
 * Verified against plan sheet; separate from cut lengths (outer girder cut ≠ layout side).
 */
export const LAYOUT = Object.freeze({
  outerSideMm: 3502,
  outerSideIn: "11'-5 7/8\"",
  innerTriangleMm: 489,
  innerTriangleIn: "1'-7 1/4\"",
  heightMm: 5390,
  heightIn: "17'-8 3/16\"",
  toCenterMm: 2978,
  toCenterIn: "9'-9 1/4\"",
  diagonalMm: 5666,
  diagonalIn: "18'-7 1/16\"",
  source: 'PDF Girder Layout - 20′',
  provisional: false,
  note: 'Layout check dims (to center / diagonal / height / sides). Cut girders from OUTER_GIRDER / INNER_GIRDER.'
});

/** Size-specific + general materials for 20′ from PDF Materials page */
export const MATERIALS = Object.freeze({
  sizeSpecific: [
    { qty: 15, desc: "2×6×10′ joists" },
    { qty: 8, desc: "2×6×12′ blocking and rim" },
    { qty: 4, desc: "2×6×10′ blocking and rim" },
    { qty: 5, desc: "4×6×12′ outer girders" },
    { qty: 1, desc: "4×6×8′ inner girders" },
    { qty: 9, desc: "4×8′ sheets of subfloor material" },
    { qty: 320, desc: '2″ screws (subfloor)' }
  ],
  general: [
    { qty: 16, desc: '8″ GRK or equivalent lag screws' },
    { qty: null, desc: '32′ of metal strapping or equivalent metal hanger and strapping nails' },
    { qty: 250, desc: '3½″ framing nails or equivalent' },
    { qty: 15, desc: 'Post and base assemblies' },
    { qty: 3, desc: "2×4×10′ for post bracing (add more as needed)" }
  ],
  notableTools: [
    'Circular saw / miter saw',
    'Tape measure',
    'Hammer',
    'Speed square / protractor',
    'Straight edge or chalk line',
    'Screw gun if using screws',
    'Laser level or string level',
    'String line'
  ]
});

/** Locked plan imperial strings keyed by mm — do not invent fractions from rounding */
export const PLAN_IN = new Map([
  [JOIST.lenMm, JOIST.lenIn],
  [RIM.lenMm, RIM.lenIn],
  [OUTER_BLOCK.lenMm, OUTER_BLOCK.lenIn],
  [INNER_BLOCK.lenMm, INNER_BLOCK.lenIn],
  [OUTER_GIRDER.lenMm, OUTER_GIRDER.lenIn],
  [INNER_GIRDER.lenMm, INNER_GIRDER.lenIn],
  [LAYOUT.outerSideMm, LAYOUT.outerSideIn],
  [LAYOUT.innerTriangleMm, LAYOUT.innerTriangleIn],
  [LAYOUT.heightMm, LAYOUT.heightIn],
  [LAYOUT.toCenterMm, LAYOUT.toCenterIn],
  [LAYOUT.diagonalMm, LAYOUT.diagonalIn]
]);

export const META = Object.freeze({
  label: DECK_LABEL,
  planDiameterFt: PLAN_DIAMETER_FT,
  dome: 'Trillium 5/8 3v',
  domeSize: DOME_SIZE,
  areaSqFt: AREA_SQ_FT,
  units: 'mm',
  source: 'Trillium Dome & Yurt Wood Deck PDF — Component Dimensions (20′) + Girder Layout - 20′; personal-use plans',
  note: 'Nearest PDF size for 18′ dome — do not interpolate 18′ lengths'
});

export default {
  META,
  DECK_LABEL,
  PLAN_DIAMETER_FT,
  DOME_SIZE,
  AREA_SQ_FT,
  JOIST,
  RIM,
  OUTER_BLOCK,
  INNER_BLOCK,
  OUTER_GIRDER,
  INNER_GIRDER,
  COMPONENTS,
  LAYOUT,
  MATERIALS,
  PLAN_IN,
  TOOL_TABLE_SAW,
  TOOL_MITER_SAW,
  TOOL_CIRCULAR,
  VIDEO_URL
};
