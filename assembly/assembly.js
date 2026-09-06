/**
 * Trillium 5/8 3v — Milestone 1 full panel-shell assembly viewer.
 * Dims/counts from panel-specs.js; topology from loadPanelMap().
 * doorHalf trusted on TPM-approved map (c1274fd+).
 *
 * Coordinate conversion (documented):
 *   JSON map is Z-up (x, y, z). Three.js display is Y-up:
 *   (x, y, z)_Zup  ->  (x, z, -y)_Yup
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import {
  HEX,
  PENT,
  DOOR,
  META,
  CHORD,
  BEVEL_DEG,
  PLAN_IN,
  VIDEO_URL,
  loadPanelMap
} from '../panel/panel-specs.js';

function zUpToYUp(x, y, z) {
  return new THREE.Vector3(x, z, -y);
}

const COLORS = {
  hex: 0x3d8bfd,
  pent: 0xf0a202,
  window: 0x7dcea0,
  doorHalf: 0xc45c8a,
  highlight: 0xffffff,
  edge: 0x1a1e26
};

let units = 'in';
let step = 0;
let panelMap = null;
let edgeById = new Map();
let faceById = new Map();
let rings = [];
/** Active ring index while on step 3 (Ring-by-ring). */
let ringFocus = 0;
let selectedId = null;

const filters = { hex: true, pent: true, window: true, doorHalf: true };

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121418);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
camera.position.set(8, 6, 10);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 2.5, 0);

scene.add(new THREE.HemisphereLight(0xc8d4e8, 0x2a2118, 1.0));
const sun = new THREE.DirectionalLight(0xfff3e0, 1.2);
sun.position.set(5, 10, 4);
scene.add(sun);
scene.add(new THREE.AmbientLight(0xffffff, 0.28));

const shellGroup = new THREE.Group();
scene.add(shellGroup);
const faceMeshes = new Map();

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

/** PLAN_IN / locked *In only — never invent fractions. */
function fmtLen(mm) {
  const n = Math.round(Number(mm));
  if (units === 'mm') return `${n} mm`;
  if (PLAN_IN.has(n)) return PLAN_IN.get(n);
  if (PLAN_IN.has(Number(mm))) return PLAN_IN.get(Number(mm));
  if (n === HEX.a || n === HEX.b) return HEX.aIn;
  if (n === HEX.c) return HEX.cIn;
  if ((n === PENT.a || n === PENT.b) && PENT.aIn) return PENT.aIn;
  if (n === PENT.c) return PENT.cIn || HEX.cIn;
  if (n === DOOR.a && DOOR.aIn) return DOOR.aIn;
  if (n === DOOR.b && DOOR.bIn) return DOOR.bIn;
  if (n === DOOR.c) return DOOR.cIn || HEX.cIn;
  return `${n} mm`;
}

function chordLabel(chord, lengthMm) {
  const L = fmtLen(lengthMm);
  return chord ? `${chord} (${L})` : L;
}

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

/**
 * Rings = BFS graph-distance from apex faces (doorHalf excluded).
 * Apex faces = panels incident to the highest-Z vertex in the Z-up map
 * (becomes +Y after zUpToYUp). Ring 0 = crown; higher rings grow outward.
 * This is topology for DIY assembly order — not PDF exploded section numbers.
 */
function buildRings(faces, verts) {
  let apex = 0;
  let bestZ = -Infinity;
  verts.forEach((v, i) => {
    if (v[2] > bestZ) {
      bestZ = v[2];
      apex = i;
    }
  });
  const apexFaces = faces
    .filter((f) => f.type !== 'doorHalf' && f.vertices.includes(apex))
    .map((f) => f.id);

  const adj = new Map();
  for (const f of faces) {
    if (f.type === 'doorHalf') continue;
    const set = new Set();
    for (const n of f.neighbors || []) {
      if (n.face && faceById.get(n.face)?.type !== 'doorHalf') set.add(n.face);
    }
    adj.set(f.id, set);
  }

  const dist = new Map();
  const q = [];
  for (const id of apexFaces) {
    dist.set(id, 0);
    q.push(id);
  }
  while (q.length) {
    const u = q.shift();
    for (const v of adj.get(u) || []) {
      if (!dist.has(v)) {
        dist.set(v, dist.get(u) + 1);
        q.push(v);
      }
    }
  }

  const maxR = Math.max(0, ...dist.values());
  const out = Array.from({ length: maxR + 1 }, () => []);
  for (const [id, d] of dist) out[d].push(id);
  for (const row of out) row.sort();
  return out;
}

function faceColor(face) {
  if (face.type === 'doorHalf') return COLORS.doorHalf;
  if (face.window) return COLORS.window;
  if (face.type === 'pent') return COLORS.pent;
  return COLORS.hex;
}

function makeFaceMesh(face, vertsYup) {
  const a = vertsYup[face.vertices[0]];
  const b = vertsYup[face.vertices[1]];
  const c = vertsYup[face.vertices[2]];
  const geom = new THREE.BufferGeometry();
  geom.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z]),
      3
    )
  );
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: faceColor(face),
    roughness: 0.55,
    metalness: 0.05,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.92
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.userData.faceId = face.id;
  mesh.userData.kind = face.window ? 'window' : face.type;

  const line = new THREE.LineSegments(
    new THREE.EdgesGeometry(geom),
    new THREE.LineBasicMaterial({ color: COLORS.edge })
  );
  mesh.add(line);
  return mesh;
}

function clearShell() {
  for (const mesh of faceMeshes.values()) {
    shellGroup.remove(mesh);
    mesh.geometry.dispose();
    mesh.material.dispose();
  }
  faceMeshes.clear();
}

function buildShell(map) {
  clearShell();
  edgeById = new Map(map.edges.map((e) => [e.id, e]));
  faceById = new Map(map.faces.map((f) => [f.id, f]));

  const scale = 0.001;
  const vertsYup = map.vertices.map(([x, y, z]) =>
    zUpToYUp(x, y, z).multiplyScalar(scale)
  );

  for (const face of map.faces) {
    const mesh = makeFaceMesh(face, vertsYup);
    shellGroup.add(mesh);
    faceMeshes.set(face.id, mesh);
  }

  rings = buildRings(
    map.faces.filter((f) => f.type !== 'doorHalf'),
    map.vertices
  );
  ringFocus = Math.min(ringFocus, Math.max(rings.length - 1, 0));

  const box = new THREE.Box3().setFromObject(shellGroup);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  controls.target.copy(center);
  const radius = Math.max(size.x, size.y, size.z) * 0.75;
  camera.position.set(
    center.x + radius * 1.4,
    center.y + radius * 0.85,
    center.z + radius * 1.4
  );
  camera.near = Math.max(radius / 100, 0.01);
  camera.far = radius * 50;
  camera.updateProjectionMatrix();
  controls.update();
}

function applyFilters() {
  for (const [id, mesh] of faceMeshes) {
    const face = faceById.get(id);
    let show = true;
    if (face.type === 'doorHalf') show = filters.doorHalf;
    else if (face.window) show = filters.window;
    else if (face.type === 'hex') show = filters.hex;
    else if (face.type === 'pent') show = filters.pent;
    mesh.visible = show;
  }
}

function stepDim(faceId) {
  const s = STEPS[step];
  if (!s?.focusIds) return false;
  const set = s.focusIds();
  if (!set) return false;
  return !set.has(faceId);
}

function setHighlight(faceId) {
  for (const [id, mesh] of faceMeshes) {
    const face = faceById.get(id);
    const base = faceColor(face);
    if (faceId && id === faceId) {
      mesh.material.color.setHex(COLORS.highlight);
      mesh.material.emissive = new THREE.Color(0x334455);
      mesh.material.emissiveIntensity = 0.35;
      mesh.material.opacity = 1;
    } else {
      mesh.material.color.setHex(base);
      mesh.material.emissive = new THREE.Color(0x000000);
      mesh.material.emissiveIntensity = 0;
      mesh.material.opacity = stepDim(id) ? 0.22 : 0.92;
    }
  }
}

function showDetail(faceId) {
  selectedId = faceId;
  const el = document.getElementById('detail');
  const face = faceById.get(faceId);
  if (!face) {
    el.textContent = 'Click a face for id, type, neighbors, edge chords.';
    setHighlight(null);
    return;
  }
  const edges = (face.edges || []).map((eid) => {
    const e = edgeById.get(eid);
    if (!e) return `${eid}: ?`;
    return `${eid}: ${chordLabel(e.chord, e.length_mm)}`;
  });
  const neighbors = (face.neighbors || [])
    .map((n) => {
      if (!n.face) return `${n.edge} -> (open / none)`;
      const nf = faceById.get(n.face);
      const tag = nf
        ? `${n.face} (${nf.type}${nf.window ? ', window' : ''})`
        : n.face;
      return `${n.edge} -> ${tag}`;
    })
    .join('\n  ');

  let typeLine = face.type;
  if (face.window) typeLine = 'hex · window (provisional id)';

  const chordPat =
    face.type === 'pent'
      ? PENT.chord
      : face.type === 'doorHalf'
        ? 'DOOR a-b-c'
        : HEX.chord;

  el.innerHTML =
    `<strong>${face.id}</strong> · ${typeLine}` +
    (face.mirror ? ` · mirror ${face.mirror}` : '') +
    (face.parentHexId ? ` · parent ${face.parentHexId}` : '') +
    `\nchord pattern: ${chordPat}` +
    `\nedges:\n  ${edges.join('\n  ')}` +
    `\nneighbors:\n  ${neighbors || '(none)'}` +
    (face.window
      ? `\nNote: window face ids are provisional — PDF section labels not mapped.`
      : '');
  setHighlight(faceId);
}

function countsText() {
  const hex = META.counts.hex;
  const pent = META.counts.pent;
  const R = panelMap?.meta?.radius_mm;
  const winIds =
    panelMap?.meta?.windowAssignment?.faceIds?.join(', ') || 'f67, f49, f22, f40';
  const doorParents =
    panelMap?.meta?.doorAssignment?.parentHexIds?.join(', ') || 'f81, f84';
  return (
    `Overview — ${META.dome} ${META.size}\n` +
    `Panels: hex x${hex} (incl. ${HEX.windows} windows) · pent x${pent} · doorHalf x${DOOR.qty}\n` +
    `Classic before doors: ${META.classicBeforeDoors.hex} hex + ${META.classicBeforeDoors.pent} pent\n` +
    `Map: ${faceMeshes.size} faces · ${panelMap?.vertices?.length ?? '?'} verts` +
    (R
      ? ` · map radius ≈${fmtLen(Math.round(R))} (generated topology scale — approximate; plan footprint is ${META.size}, not an exact PDF radius)`
      : ` · plan footprint ${META.size}`) +
    `\nBuild sequence (practice): crown → outward rings → door halves.` +
    `\nWork using the Trillium PDF exploded view + component list for section counts and which panels belong together (face ids here ≠ PDF section numbers).` +
    `\nDoor parents: ${doorParents} (2 LH + 2 RH)\n` +
    `Windows (provisional ids): ${winIds}\n` +
    `Chords: ${CHORD.label.A}, ${CHORD.label.B}, ${CHORD.label.C}\n` +
    `Bevel (fab ref): ${BEVEL_DEG} deg out — join shared edges bevels-out.`
  );
}

const STEPS = [
  {
    title: '1. Overview',
    text: () => countsText(),
    focusIds: () => null
  },
  {
    title: '2. Apex / crown',
    text: () => {
      const crown = rings[0] || [];
      return (
        `Build sequence: crown → outward → door halves (build practice).\n` +
        `Start at the crown (highest Z in map → +Y after conversion).\n` +
        `Ring 0: ${crown.length} pent panels at the apex.\n` +
        `Ids: ${crown.join(', ') || '(none)'}\n` +
        `Place these first; they set orientation for lower rings.\n` +
        `Use the PDF exploded view / component list to confirm which crown panels belong together.`
      );
    },
    focusIds: () => new Set(rings[0] || [])
  },
  {
    title: '3. Ring-by-ring',
    text: () => {
      const i = Math.min(Math.max(ringFocus, 0), Math.max(rings.length - 1, 0));
      const ids = rings[i] || [];
      let h = 0;
      let p = 0;
      let w = 0;
      for (const id of ids) {
        const f = faceById.get(id);
        if (!f) continue;
        if (f.window) w++;
        else if (f.type === 'hex') h++;
        else if (f.type === 'pent') p++;
      }
      const summary = rings.map((row, ri) => {
        let hh = 0;
        let pp = 0;
        let ww = 0;
        for (const id of row) {
          const f = faceById.get(id);
          if (!f) continue;
          if (f.window) ww++;
          else if (f.type === 'hex') hh++;
          else if (f.type === 'pent') pp++;
        }
        const mark = ri === i ? ' ←' : '';
        return `  Ring ${ri}: ${row.length}  (hex ${hh}, pent ${pp}, window ${ww})${mark}`;
      });
      return (
        `Grow outward: crown → rings → door halves.\n` +
        `Rings = BFS distance from apex faces (topology; doorHalf excluded).\n` +
        `Focus Ring ${i}: ${ids.length} panels (hex ${h}, pent ${p}, window ${w}).\n` +
        `Ids: ${ids.join(', ') || '(none)'}\n` +
        `Match chord labels on shared edges (A/B/C from specs).\n` +
        `Each join: clamp shared edges flush (bevels out), predrill if needed, screw; check gaps before the next ring.\n` +
        `Work using the PDF exploded view for section counts / which panels belong together.\n` +
        `All rings:\n` +
        summary.join('\n') +
        `\nTip: use Ring 0…N buttons (or Prev/Next) to highlight one ring; click a face for neighbors.`
      );
    },
    focusIds: () => {
      const i = Math.min(Math.max(ringFocus, 0), Math.max(rings.length - 1, 0));
      return new Set(rings[i] || []);
    }
  },
  {
    title: '4. Door halves',
    text: () => {
      const parents =
        panelMap?.meta?.doorAssignment?.parentHexIds?.join(', ') || 'f81, f84';
      const doors = [...faceById.values()].filter((f) => f.type === 'doorHalf');
      const lines = doors.map((f) => {
        const edges = (f.edges || []).map((eid) => {
          const e = edgeById.get(eid);
          return e ? chordLabel(e.chord, e.length_mm) : eid;
        });
        return `  ${f.id} ${f.mirror || '?'} parent ${f.parentHexId || '?'} · ${edges.join(', ')}`;
      });
      return (
        `Last in sequence: door halves after crown and outward rings.\n` +
        `Install door halves (2 LH + 2 RH).\n` +
        `Specs: a=${fmtLen(DOOR.a)}, b=${fmtLen(DOOR.b)}, base ${fmtLen(DOOR.c)}.\n` +
        `Parents: ${parents}.\n` +
        lines.join('\n') +
        `\nMatch LH/RH to mirror; join on shared B-base with neighbors.\n` +
        `Confirm pairs against the PDF exploded view / component list before fastening.`
      );
    },
    focusIds: () =>
      new Set(
        [...faceById.values()]
          .filter((f) => f.type === 'doorHalf')
          .map((f) => f.id)
      )
  },
  {
    title: '5. Window callouts',
    text: () => {
      const ids =
        panelMap?.meta?.windowAssignment?.faceIds ||
        [...faceById.values()].filter((f) => f.window).map((f) => f.id);
      return (
        `Window hex panels — provisional map ids (PDF section labels not mapped):\n` +
        `  ${ids.join(', ')}\n` +
        `Same Hex frame dims (${fmtLen(HEX.a)} / ${fmtLen(HEX.b)} / base ${fmtLen(HEX.c)}).\n` +
        `Treat as hex in the ring sequence; mark for glazing later.\n` +
        `Cross-check window locations on the PDF exploded view when section labels are available.`
      );
    },
    focusIds: () => {
      const ids =
        panelMap?.meta?.windowAssignment?.faceIds ||
        [...faceById.values()].filter((f) => f.window).map((f) => f.id);
      return new Set(ids);
    }
  },
  {
    title: '6. Fit-check',
    text: () =>
      `Fit-check (assembly, not fabrication) — DIY fastening each join:\n` +
      `· Bevels face outward (${BEVEL_DEG} deg from Hex shop).\n` +
      `· Clamp shared edges flush before fastening; bevels out.\n` +
      `· Predrill if needed, then screw; do not force a gap closed.\n` +
      `· Check gaps / chord match before starting the next ring (from build video).\n` +
      `· Door halves: confirm LH/RH and parent openings before locking base.\n` +
      `· Re-check crown symmetry before locking lower rings.\n` +
      `Build video: ${VIDEO_URL}`
  }
];

function renderSteps() {
  const host = document.getElementById('steps');
  host.innerHTML = '';
  STEPS.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'step' + (i === step ? ' active' : '');
    b.textContent = s.title;
    b.addEventListener('click', () => {
      step = i;
      if (step === 2) ringFocus = Math.min(ringFocus, Math.max(rings.length - 1, 0));
      syncStep();
    });
    host.appendChild(b);
  });
}

function renderRingNav() {
  const host = document.getElementById('ringNav');
  if (!host) return;
  host.innerHTML = '';
  const ringStep = step === 2;
  host.hidden = !ringStep;
  if (!ringStep) return;

  const label = document.createElement('div');
  label.className = 'ring-label';
  label.textContent =
    'Ring focus (BFS from apex) — dim others & list face ids:';
  host.appendChild(label);

  const row = document.createElement('div');
  row.className = 'row';
  rings.forEach((_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'ring' + (i === ringFocus ? ' active' : '');
    b.textContent = `Ring ${i}`;
    b.addEventListener('click', () => {
      ringFocus = i;
      syncStep();
    });
    row.appendChild(b);
  });
  host.appendChild(row);
}

function syncStep() {
  if (rings.length) {
    ringFocus = Math.min(Math.max(ringFocus, 0), rings.length - 1);
  } else {
    ringFocus = 0;
  }
  const onRing = step === 2;
  const label = onRing
    ? `${step + 1} / ${STEPS.length} · Ring ${ringFocus + 1}/${Math.max(rings.length, 1)}`
    : `${step + 1} / ${STEPS.length}`;
  document.getElementById('stepLabel').textContent = label;
  document.getElementById('stepBody').textContent = STEPS[step].text();
  renderSteps();
  renderRingNav();
  // Prev/Next also walk rings while on step 3 (without leaving the step).
  document.getElementById('btnPrev').disabled = step === 0;
  document.getElementById('btnNext').disabled = step === STEPS.length - 1;
  setHighlight(selectedId);
}

function resetView() {
  if (!panelMap) return;
  buildShell(panelMap);
  applyFilters();
  syncStep();
}

document.getElementById('uIN').addEventListener('click', () => {
  units = 'in';
  document.getElementById('uIN').classList.add('active');
  document.getElementById('uMM').classList.remove('active');
  syncStep();
  if (selectedId) showDetail(selectedId);
});
document.getElementById('uMM').addEventListener('click', () => {
  units = 'mm';
  document.getElementById('uMM').classList.add('active');
  document.getElementById('uIN').classList.remove('active');
  syncStep();
  if (selectedId) showDetail(selectedId);
});
document.getElementById('btnReset').addEventListener('click', resetView);
document.getElementById('btnPrev').addEventListener('click', () => {
  if (step === 2 && ringFocus > 0) {
    ringFocus--;
    syncStep();
    return;
  }
  if (step > 0) {
    step--;
    if (step === 2) ringFocus = Math.max(rings.length - 1, 0);
    syncStep();
  }
});
document.getElementById('btnNext').addEventListener('click', () => {
  if (step === 2 && ringFocus < rings.length - 1) {
    ringFocus++;
    syncStep();
    return;
  }
  if (step < STEPS.length - 1) {
    step++;
    if (step === 2) ringFocus = 0;
    syncStep();
  }
});

document.getElementById('filters').addEventListener('click', (ev) => {
  const btn = ev.target.closest('button[data-filter]');
  if (!btn) return;
  const key = btn.dataset.filter;
  filters[key] = !filters[key];
  btn.classList.toggle('active', filters[key]);
  applyFilters();
});

canvas.addEventListener('pointerdown', (ev) => {
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = [...faceMeshes.values()].filter((m) => m.visible);
  const hits = raycaster.intersectObjects(targets, false);
  if (!hits.length) {
    showDetail(null);
    return;
  }
  showDetail(hits[0].object.userData.faceId);
});

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

async function main() {
  const detail = document.getElementById('detail');
  try {
    panelMap = await loadPanelMap();
  } catch (err) {
    detail.textContent = `Failed to load panel map: ${err.message}`;
    return;
  }
  buildShell(panelMap);
  applyFilters();
  renderSteps();
  syncStep();
  showDetail(null);
}

main();
