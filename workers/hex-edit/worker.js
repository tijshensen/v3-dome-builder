/**
 * Minimal Cloudflare Worker — POST /api/hex-edit
 * Env: XAI_API_KEY
 * Returns allowlisted JSON override for Hex 3D edit-via-Grok spike.
 */

const ALLOW = new Set([
  'schemaVersion', 'note', 'qtyLabel', 'dimsLabel', 'labelTexts',
  'stackCount', 'stackRows', 'scale', 'miterDeg', 'bevelDeg', 'highlightColor'
]);

const SYSTEM = `You edit a shop 3D preview overlay. Reply with ONLY a JSON object, no markdown, no code fences, no JavaScript.
schemaVersion must be 1. Only these optional keys:
note, qtyLabel, dimsLabel (strings),
labelTexts (string array),
stackCount, stackRows, scale, miterDeg, bevelDeg (numbers),
highlightColor (#rrggbb).
Omit unknown keys. Keep strings short (shop English).

Context JSON fields (geometryBrief, dimsMm, qty, stackCount, stackRows, bevelDeg, miterDeg, defaultColors, parts, callout, currentOverride) are authored ground truth for the current node. Return only allowlisted override keys. When the user asks about size, stack, color, or angles, use the numbers and colors from that context — do not invent dims.`;

function corsHeaders(origin) {
  const allow = origin && (
    origin === 'https://diy-dome-guides.pages.dev' ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  );
  return {
    'Access-Control-Allow-Origin': allow ? origin : 'https://diy-dome-guides.pages.dev',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function clampStr(s, max) {
  if (typeof s !== 'string') return undefined;
  const t = s.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function validateOverride(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = { schemaVersion: 1 };
  for (const k of Object.keys(raw)) {
    if (!ALLOW.has(k)) continue;
    const v = raw[k];
    if (k === 'note' || k === 'qtyLabel' || k === 'dimsLabel') {
      const s = clampStr(v, 120);
      if (s !== undefined) out[k] = s;
    } else if (k === 'labelTexts' && Array.isArray(v)) {
      const arr = v.map((x) => clampStr(x, 80)).filter(Boolean).slice(0, 8);
      if (arr.length) out.labelTexts = arr;
    } else if (k === 'stackCount') {
      const n = Number(v); if (Number.isFinite(n)) out.stackCount = Math.min(64, Math.max(1, n));
    } else if (k === 'stackRows') {
      const n = Number(v); if (Number.isFinite(n)) out.stackRows = Math.min(16, Math.max(1, n));
    } else if (k === 'scale') {
      const n = Number(v); if (Number.isFinite(n)) out.scale = Math.min(2.5, Math.max(0.4, n));
    } else if (k === 'miterDeg') {
      const n = Number(v); if (Number.isFinite(n)) out.miterDeg = Math.min(60, Math.max(0, n));
    } else if (k === 'bevelDeg') {
      const n = Number(v); if (Number.isFinite(n)) out.bevelDeg = Math.min(45, Math.max(0, n));
    } else if (k === 'highlightColor' && typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim())) {
      out.highlightColor = v.trim().toLowerCase();
    }
  }
  if (Object.keys(out).filter((k) => k !== 'schemaVersion').length === 0) return null;
  return out;
}

function parseModelJson(text) {
  let s = String(text || '').trim();
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start >= 0 && end > start) s = s.slice(start, end + 1);
  return JSON.parse(s);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: false, error: 'POST only' }), { status: 405, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), { status: 400, headers });
    }

    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return new Response(JSON.stringify({ ok: false, error: 'prompt required' }), { status: 400, headers });
    }
    if (!env.XAI_API_KEY) {
      return new Response(JSON.stringify({ ok: false, error: 'XAI_API_KEY not set' }), { status: 500, headers });
    }

    const userPayload = {
      schemaVersion: 1,
      prompt,
      context: body.context || {}
    };

    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.XAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'grok-build-0.1',
          temperature: 0.2,
          messages: [
            { role: 'system', content: SYSTEM },
            { role: 'user', content: JSON.stringify(userPayload) }
          ]
        })
      });
      if (!res.ok) {
        const t = await res.text();
        return new Response(JSON.stringify({ ok: false, error: `xAI ${res.status}: ${t.slice(0, 200)}` }), { status: 502, headers });
      }
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      let parsed;
      try {
        parsed = parseModelJson(content);
      } catch {
        return new Response(JSON.stringify({ ok: false, error: 'Model did not return JSON' }), { status: 502, headers });
      }
      const override = validateOverride(parsed);
      if (!override) {
        return new Response(JSON.stringify({ ok: false, error: 'Override failed allowlist validation' }), { status: 502, headers });
      }
      return new Response(JSON.stringify({ ok: true, override }), { status: 200, headers });
    } catch (err) {
      return new Response(JSON.stringify({ ok: false, error: String(err && err.message || err) }), { status: 500, headers });
    }
  }
};
