#!/usr/bin/env python3
"""
Generate Trillium 5/8 3v panel-map JSON for Assembler.

Convention:
  - Z-up (north pole +Z)
  - Class I frequency-3 icosahedral geodesic
  - 5/8 truncation: keep faces whose centroid z >= -0.25 * R
    (sphere from -R..+R; 5/8 of diameter from north pole → plane at z=-R/4)
  - Scale so median B-chord (mid-length class) ≈ 1130 mm
  - Classify faces by sorted edge lengths → hex (A-A-B) / pent (C-C-B)
  - Replace 2 base-row hex faces with 4 doorHalf faces (2 LH + 2 RH)
  - Mark 4 hex as windows (heuristic azimuth spread);
    window IDs provisional until PDF section map — see meta.windowAssignment
  - Door halves: physical a/b/c from DOOR specs with LH/RH mirror; partial-hex placement

PDF exploded-view section numbers are NOT mapped; face ids are generated (f0, f1, ...).
"""
from __future__ import annotations

import json
import math
from collections import defaultdict
from pathlib import Path

A_MM = 1155.0
B_MM = 1130.0
C_MM = 976.0

DOOR = dict(a=986.0, b=577.0, c=1130.0, apex=1.4, baseL=59.3, baseR=29.3)


def _cross(a, b):
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]


def _norm(v):
    n = math.sqrt(sum(c * c for c in v))
    return [c / n for c in v]


def icosahedron_vertices():
    """Unit icosahedron with a vertex at +Z (Z-up)."""
    phi = (1 + math.sqrt(5)) / 2
    raw = []
    for x in (-1, 1):
        for y in (-1, 1):
            raw.append((0.0, x / phi, y))
            raw.append((x, 0.0, y / phi))
            raw.append((x / phi, y, 0.0))
    verts = []
    for x, y, z in raw:
        n = math.sqrt(x * x + y * y + z * z)
        verts.append([x / n, y / n, z / n])
    top_i = max(range(len(verts)), key=lambda i: verts[i][2])
    top = verts[top_i]
    e3 = top[:]
    helper = [1.0, 0.0, 0.0] if abs(e3[0]) < 0.9 else [0.0, 1.0, 0.0]
    e1 = _norm(_cross(helper, e3))
    e2 = _cross(e3, e1)
    rotated = []
    for v in verts:
        xp = e1[0] * v[0] + e1[1] * v[1] + e1[2] * v[2]
        yp = e2[0] * v[0] + e2[1] * v[1] + e2[2] * v[2]
        zp = e3[0] * v[0] + e3[1] * v[1] + e3[2] * v[2]
        rotated.append([xp, yp, zp])
    ni = max(range(len(rotated)), key=lambda i: rotated[i][2])
    dots = sorted(
        ((sum(rotated[ni][k] * rotated[j][k] for k in range(3)), j)
         for j in range(len(rotated)) if j != ni),
        reverse=True,
    )
    neigh = rotated[dots[0][1]]
    ang = math.atan2(neigh[1], neigh[0])
    ca, sa = math.cos(-ang), math.sin(-ang)
    out = []
    for x, y, z in rotated:
        out.append([ca * x - sa * y, sa * x + ca * y, z])
    return out


def icosahedron_faces(verts):
    n = len(verts)
    dots = []
    for i in range(n):
        for j in range(i + 1, n):
            d = sum(verts[i][k] * verts[j][k] for k in range(3))
            dots.append((d, i, j))
    dots.sort(reverse=True)
    edges = [(i, j) for _, i, j in dots[:30]]
    adj = defaultdict(set)
    for i, j in edges:
        adj[i].add(j)
        adj[j].add(i)
    faces = []
    seen = set()
    for i in range(n):
        for j in adj[i]:
            for k in adj[i]:
                if j >= k:
                    continue
                if k in adj[j]:
                    tri = tuple(sorted((i, j, k)))
                    if tri in seen:
                        continue
                    seen.add(tri)
                    a, b, c = verts[tri[0]], verts[tri[1]], verts[tri[2]]
                    nrm = _cross(
                        [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
                        [c[0] - a[0], c[1] - a[1], c[2] - a[2]],
                    )
                    cen = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]
                    if sum(nrm[t] * cen[t] for t in range(3)) < 0:
                        faces.append([tri[0], tri[2], tri[1]])
                    else:
                        faces.append([tri[0], tri[1], tri[2]])
    assert len(faces) == 20, f"expected 20 faces, got {len(faces)}"
    return faces


def subdivide(verts, faces, freq: int):
    verts = [v[:] for v in verts]
    vcache = {}

    def ek(i, j, t):
        return (i, j, t) if i < j else (j, i, freq - t)

    def point(i, j, t):
        if t == 0:
            return i
        if t == freq:
            return j
        k = ek(i, j, t)
        if k in vcache:
            return vcache[k]
        a, b = verts[i], verts[j]
        tfrac = t / freq
        p = _norm([
            a[0] + (b[0] - a[0]) * tfrac,
            a[1] + (b[1] - a[1]) * tfrac,
            a[2] + (b[2] - a[2]) * tfrac,
        ])
        idx = len(verts)
        verts.append(p)
        vcache[k] = idx
        return idx

    new_faces = []
    for i, j, k in faces:
        grid = [[None] * (freq + 1 - row) for row in range(freq + 1)]
        for row in range(freq + 1):
            for col in range(freq + 1 - row):
                if row == 0:
                    grid[row][col] = point(i, j, col)
                elif col == 0:
                    grid[row][col] = point(i, k, row)
                elif col + row == freq:
                    grid[row][col] = point(j, k, row)
                else:
                    a = freq - row - col
                    b = col
                    c = row
                    p = _norm([
                        (a * verts[i][0] + b * verts[j][0] + c * verts[k][0]) / freq,
                        (a * verts[i][1] + b * verts[j][1] + c * verts[k][1]) / freq,
                        (a * verts[i][2] + b * verts[j][2] + c * verts[k][2]) / freq,
                    ])
                    found = None
                    for vi, vv in enumerate(verts):
                        if (abs(vv[0] - p[0]) < 1e-9 and abs(vv[1] - p[1]) < 1e-9
                                and abs(vv[2] - p[2]) < 1e-9):
                            found = vi
                            break
                    if found is None:
                        found = len(verts)
                        verts.append(p)
                    grid[row][col] = found
        for row in range(freq):
            for col in range(freq - row):
                v00 = grid[row][col]
                v10 = grid[row][col + 1]
                v01 = grid[row + 1][col]
                new_faces.append([v00, v10, v01])
                if col + row + 1 < freq:
                    v11 = grid[row + 1][col + 1]
                    new_faces.append([v10, v11, v01])
    return verts, new_faces


def face_centroid(verts, f):
    a, b, c = verts[f[0]], verts[f[1]], verts[f[2]]
    return [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3]


def truncate_5_8(verts, faces, z_cut_factor=-0.25):
    kept = []
    for f in faces:
        cen = face_centroid(verts, f)
        if cen[2] >= z_cut_factor - 1e-9:
            kept.append(f)
    return kept


def edge_key(i, j):
    return (i, j) if i < j else (j, i)


def _cluster3(values):
    vs = sorted(values)
    n = len(vs)
    centers = [vs[n // 6], vs[n // 2], vs[(5 * n) // 6]]
    for _ in range(20):
        buckets = [[], [], []]
        for v in vs:
            i = min(range(3), key=lambda j: abs(v - centers[j]))
            buckets[i].append(v)
        new_c = [sum(b) / len(b) if b else centers[i] for i, b in enumerate(buckets)]
        if max(abs(new_c[i] - centers[i]) for i in range(3)) < 1e-12:
            break
        centers = new_c
    centers.sort()
    return centers


def classify_and_scale(verts, faces):
    elen = {}
    for f in faces:
        for u, v in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            k = edge_key(u, v)
            if k not in elen:
                a, b = verts[u], verts[v]
                elen[k] = math.sqrt(sum((a[t] - b[t]) ** 2 for t in range(3)))

    clusters = _cluster3(sorted(elen.values()))
    c_len, b_len, a_len = clusters[0], clusters[1], clusters[2]
    scale = B_MM / b_len
    radius_mm = scale

    def chord_of(L):
        dA, dB, dC = abs(L - a_len), abs(L - b_len), abs(L - c_len)
        m = min(dA, dB, dC)
        if m == dA:
            return "A", A_MM
        if m == dB:
            return "B", B_MM
        return "C", C_MM

    sverts = [[c * scale for c in v] for v in verts]

    edges_out = []
    edge_id = {}
    for ei, (k, L) in enumerate(sorted(elen.items())):
        ch, Lmm = chord_of(L)
        eid = f"e{ei}"
        edge_id[k] = eid
        edges_out.append({"id": eid, "v": [k[0], k[1]], "length_mm": Lmm, "chord": ch})

    faces_meta = []
    for fi, f in enumerate(faces):
        eks = [edge_key(f[0], f[1]), edge_key(f[1], f[2]), edge_key(f[2], f[0])]
        eids = [edge_id[k] for k in eks]
        chords = []
        for eid in eids:
            e = next(x for x in edges_out if x["id"] == eid)
            chords.append(e["chord"])
        sc = sorted(chords)
        if sc == ["A", "A", "B"]:
            ftype = "hex"
        elif sc == ["B", "C", "C"]:
            ftype = "pent"
        else:
            lens = sorted(next(x["length_mm"] for x in edges_out if x["id"] == eid) for eid in eids)
            if abs(lens[0] - A_MM) < 2 and abs(lens[1] - A_MM) < 2:
                ftype = "hex"
            elif abs(lens[0] - C_MM) < 2 and abs(lens[1] - C_MM) < 2:
                ftype = "pent"
            else:
                ftype = "other"
        faces_meta.append({
            "id": f"f{fi}",
            "type": ftype,
            "mirror": None,
            "vertices": list(f),
            "edges": eids,
            "neighbors": [],
            "window": False,
            "chords": chords,
        })

    edge_to_faces = defaultdict(list)
    for fm in faces_meta:
        for eid in fm["edges"]:
            edge_to_faces[eid].append(fm["id"])
    for fm in faces_meta:
        nbrs = []
        for eid in fm["edges"]:
            others = [fid for fid in edge_to_faces[eid] if fid != fm["id"]]
            nbrs.append({"edge": eid, "face": others[0] if others else None})
        fm["neighbors"] = nbrs

    return sverts, edges_out, faces_meta, radius_mm, {
        "A_unit": a_len, "B_unit": b_len, "C_unit": c_len, "scale": scale,
    }


def pick_door_hexes(faces_meta, verts):
    hexes = [fm for fm in faces_meta if fm["type"] == "hex"]

    def cen_z(fm):
        vs = fm["vertices"]
        return sum(verts[i][2] for i in vs) / 3

    hexes_sorted = sorted(hexes, key=cen_z)
    low_band_z = cen_z(hexes_sorted[0])
    band = [fm for fm in hexes_sorted if cen_z(fm) <= low_band_z + 80]
    id_set = {fm["id"] for fm in band}
    for fm in band:
        for nbr in fm["neighbors"]:
            if nbr["face"] in id_set:
                other = next(x for x in band if x["id"] == nbr["face"])
                return fm, other
    return hexes_sorted[0], hexes_sorted[1]


def pick_windows(faces_meta, verts, door_ids, n=4):
    candidates = [fm for fm in faces_meta if fm["type"] == "hex" and fm["id"] not in door_ids]

    def cen(fm):
        vs = fm["vertices"]
        x = sum(verts[i][0] for i in vs) / 3
        y = sum(verts[i][1] for i in vs) / 3
        z = sum(verts[i][2] for i in vs) / 3
        return x, y, z

    zs = [cen(fm)[2] for fm in candidates]
    zmin, zmax = min(zs), max(zs)
    zlo = zmin + 0.45 * (zmax - zmin)
    zhi = zmin + 0.85 * (zmax - zmin)
    mid = [fm for fm in candidates if zlo <= cen(fm)[2] <= zhi] or candidates
    targets = [0, math.pi / 2, math.pi, 3 * math.pi / 2]
    picked = []
    used = set()
    for t in targets:
        best = None
        best_d = 1e9
        for fm in mid:
            if fm["id"] in used:
                continue
            x, y, _z = cen(fm)
            az = math.atan2(y, x)
            d = abs((az - t + math.pi) % (2 * math.pi) - math.pi)
            if d < best_d:
                best_d = d
                best = fm
        if best:
            picked.append(best["id"])
            used.add(best["id"])
    return picked


def _vsub(a, b):
    return [a[i] - b[i] for i in range(3)]


def _vadd(a, b):
    return [a[i] + b[i] for i in range(3)]


def _smul(s, v):
    return [s * v[i] for i in range(3)]


def _dot(a, b):
    return sum(a[i] * b[i] for i in range(3))


def door_half_dims(mirror: str):
    """Physical a/b/c + miters matching panel-specs doorHalf(mirror)."""
    if mirror == "LH":
        return {
            "a": DOOR["a"],
            "b": DOOR["b"],
            "c": DOOR["c"],
            "apex": DOOR["apex"],
            "baseL": DOOR["baseL"],
            "baseR": DOOR["baseR"],
        }
    if mirror == "RH":
        return {
            "a": DOOR["b"],
            "b": DOOR["a"],
            "c": DOOR["c"],
            "apex": DOOR["apex"],
            "baseL": DOOR["baseR"],
            "baseR": DOOR["baseL"],
        }
    raise ValueError(f"mirror must be LH|RH, got {mirror}")


def parent_base_orientation(parent, edges_by_id):
    """
    Return (v_left, v_right, v_hex_apex, parent_b_edge_id).
    Base is the hex B chord (1130). Left/right match face winding so the
    hex apex lies to the left of left→right (CCW / outward).
    """
    edges_by_id = edges_by_id
    b_eid = None
    for eid in parent["edges"]:
        if edges_by_id[eid]["chord"] == "B" and abs(edges_by_id[eid]["length_mm"] - B_MM) < 1:
            b_eid = eid
            break
    if b_eid is None:
        # fallback: longest non-A pair — pick edge with length B_MM
        for eid in parent["edges"]:
            if abs(edges_by_id[eid]["length_mm"] - B_MM) < 1:
                b_eid = eid
                break
    if b_eid is None:
        raise RuntimeError(f"parent {parent['id']} has no B edge")

    b_vs = set(edges_by_id[b_eid]["v"])
    i0, i1, i2 = parent["vertices"]
    for a, b, c in ((i0, i1, i2), (i1, i2, i0), (i2, i0, i1)):
        if set((a, b)) == b_vs:
            return a, b, c, b_eid
    raise RuntimeError(f"could not orient base for {parent['id']}")


def place_door_apex(verts, v_left, v_right, v_hex_apex, len_left, len_right):
    """
    Third vertex of a door half in the parent face plane:
    dist(left)=len_left, dist(right)=len_right, same side of base as hex apex.
    Matches PDF partial-hex cut (lowered apex on shared B base) — not full A-A-B.
    """
    p0, p1, ph = verts[v_left], verts[v_right], verts[v_hex_apex]
    e = _vsub(p1, p0)
    base = math.sqrt(_dot(e, e))
    e_hat = _smul(1.0 / base, e)
    n = _norm(_cross(e, _vsub(ph, p0)))
    perp = _cross(n, e_hat)
    if _dot(perp, _vsub(ph, p0)) < 0:
        perp = _smul(-1.0, perp)
    x = (len_left ** 2 - len_right ** 2 + base ** 2) / (2.0 * base)
    y2 = len_left ** 2 - x * x
    y = math.sqrt(max(0.0, y2))
    return _vadd(p0, _vadd(_smul(x, e_hat), _smul(y, perp)))


def replace_doors(faces_meta, edges_out, verts, door_a, door_b):
    """
    Remove 2 parent hexes; emit 4 doorHalf faces (LH+RH per parent) with
    physical edges a/b/c from DOOR specs (mirrored). Placement shares the
    parent B base and places a lowered apex inside the hex (PDF partial hex).
    """
    edges_by_id = {e["id"]: e for e in edges_out}
    door_parents = []
    new_faces = [fm for fm in faces_meta if fm["id"] not in (door_a["id"], door_b["id"])]
    next_fi = max(int(fm["id"][1:]) for fm in faces_meta) + 1
    next_ei = max(int(e["id"][1:]) for e in edges_out) + 1

    # Neighbor across each parent's B edge (face on the other side of the door base)
    parent_base_nbr = {}
    for parent in (door_a, door_b):
        _vl, _vr, _va, b_eid = parent_base_orientation(parent, edges_by_id)
        nbr_face = None
        for nbr in parent["neighbors"]:
            if nbr["edge"] == b_eid:
                nbr_face = nbr["face"]
                break
        parent_base_nbr[parent["id"]] = (b_eid, nbr_face)

    for parent in (door_a, door_b):
        door_parents.append(parent["id"])
        v_left, v_right, v_hex_apex, parent_b_eid = parent_base_orientation(parent, edges_by_id)
        base_nbr_face = parent_base_nbr[parent["id"]][1]

        for mirror in ("LH", "RH"):
            dims = door_half_dims(mirror)
            # LH: a=986 from left, b=577 from right; RH swaps (panel-specs doorHalf)
            apex_pos = place_door_apex(
                verts, v_left, v_right, v_hex_apex, dims["a"], dims["b"]
            )
            apex_idx = len(verts)
            verts.append(apex_pos)

            eid_a = f"e{next_ei}"; next_ei += 1
            eid_b = f"e{next_ei}"; next_ei += 1
            eid_c = f"e{next_ei}"; next_ei += 1

            # Physical door edges — not the parent hex A-A-B trio
            edge_a = {
                "id": eid_a,
                "v": [v_left, apex_idx],
                "length_mm": dims["a"],
                "chord": "DOOR_a",
                "role": "a",
                "doorHalf": True,
            }
            edge_b = {
                "id": eid_b,
                "v": [apex_idx, v_right],
                "length_mm": dims["b"],
                "chord": "DOOR_b",
                "role": "b",
                "doorHalf": True,
            }
            edge_c = {
                "id": eid_c,
                "v": [v_left, v_right],
                "length_mm": dims["c"],
                "chord": "B",
                "role": "c",
                "doorHalf": True,
                "sharedWithParentEdge": parent_b_eid,
            }
            edges_out.extend([edge_a, edge_b, edge_c])
            edges_by_id[eid_a] = edge_a
            edges_by_id[eid_b] = edge_b
            edges_by_id[eid_c] = edge_c

            # Winding: left → apex → right (a, b, then c back along base right→left)
            # Store edges in documented order [a, b, c]
            fm = {
                "id": f"f{next_fi}",
                "type": "doorHalf",
                "mirror": mirror,
                "vertices": [v_left, apex_idx, v_right],
                "edges": [eid_a, eid_b, eid_c],
                "edgeOrder": ["a", "b", "c"],
                "neighbors": [
                    {"edge": eid_a, "face": None, "opening": "doorCut"},
                    {"edge": eid_b, "face": None, "opening": "doorCut"},
                    {
                        "edge": eid_c,
                        "face": base_nbr_face,
                        "viaParentHex": parent["id"],
                        "sharedWithParentEdge": parent_b_eid,
                    },
                ],
                "window": False,
                "parentHexId": parent["id"],
                "doorDims_mm": dims,
            }
            new_faces.append(fm)
            next_fi += 1

    removed = set(door_parents)
    parent_to_doors = defaultdict(list)
    for fm in new_faces:
        if fm["type"] == "doorHalf":
            parent_to_doors[fm["parentHexId"]].append(fm["id"])

    # Rewire neighbors that pointed at removed parent hexes → door halves on that parent
    for fm in new_faces:
        new_nbrs = []
        for nbr in fm["neighbors"]:
            fid = nbr.get("face")
            if fid in removed:
                replacements = parent_to_doors.get(fid, [])
                new_nbrs.append({
                    "edge": nbr["edge"],
                    "face": replacements[0] if replacements else None,
                    "viaParentHex": fid,
                })
            else:
                new_nbrs.append(nbr)
        fm["neighbors"] = new_nbrs

    return new_faces, door_parents


def compact_vertices(verts, faces_meta, edges_out):
    used = set()
    for fm in faces_meta:
        used.update(fm["vertices"])
    for e in edges_out:
        used.update(e["v"])
    old_to_new = {old: new for new, old in enumerate(sorted(used))}
    new_verts = [verts[old] for old in sorted(used)]
    for fm in faces_meta:
        fm["vertices"] = [old_to_new[i] for i in fm["vertices"]]
    for e in edges_out:
        e["v"] = [old_to_new[e["v"][0]], old_to_new[e["v"][1]]]
    return new_verts


def try_truncations(verts, faces):
    """Find z_cut that yields ~105 faces (75 hex + 30 pent classic)."""
    best = None
    for factor in [-0.25, -0.2, -0.3, -0.15, -0.35, 0.0, -0.1, -0.4]:
        faces_58 = truncate_5_8(verts, faces, z_cut_factor=factor)
        sverts, edges_out, faces_meta, radius_mm, chord_info = classify_and_scale(verts, faces_58)
        hex_n = sum(1 for f in faces_meta if f["type"] == "hex")
        pent_n = sum(1 for f in faces_meta if f["type"] == "pent")
        other_n = sum(1 for f in faces_meta if f["type"] == "other")
        score = abs(hex_n - 75) + abs(pent_n - 30) * 2 + other_n * 5 + abs(len(faces_meta) - 105)
        print(f"  z_cut={factor}: faces={len(faces_meta)} hex={hex_n} pent={pent_n} other={other_n} score={score}")
        rec = (score, factor, faces_58, sverts, edges_out, faces_meta, radius_mm, chord_info, hex_n, pent_n, other_n)
        if best is None or score < best[0]:
            best = rec
    return best


def main():
    out_path = Path(__file__).resolve().parents[1] / "panel" / "panel-map-3v-5-8.json"
    freq = 3
    verts = icosahedron_vertices()
    faces = icosahedron_faces(verts)
    verts, faces = subdivide(verts, faces, freq)
    assert len(faces) == 20 * freq * freq, f"full sphere faces={len(faces)}"
    print(f"full sphere: verts={len(verts)} faces={len(faces)}")

    best = try_truncations(verts, faces)
    score, factor, faces_58, sverts, edges_out, faces_meta, radius_mm, chord_info, hex_n, pent_n, other_n = best
    print(f"chosen z_cut={factor} score={score}")

    door_a, door_b = pick_door_hexes(faces_meta, sverts)
    window_ids = pick_windows(faces_meta, sverts, {door_a["id"], door_b["id"]}, n=4)
    for fm in faces_meta:
        if fm["id"] in window_ids:
            fm["window"] = True

    faces_final, door_parents = replace_doors(faces_meta, edges_out, sverts, door_a, door_b)
    sverts = compact_vertices(sverts, faces_final, edges_out)

    counts = {
        "hex": sum(1 for f in faces_final if f["type"] == "hex"),
        "pent": sum(1 for f in faces_final if f["type"] == "pent"),
        "doorHalf": sum(1 for f in faces_final if f["type"] == "doorHalf"),
        "other": sum(1 for f in faces_final if f["type"] == "other"),
        "windows": sum(1 for f in faces_final if f.get("window")),
    }

    public_faces = []
    for fm in faces_final:
        out = {
            "id": fm["id"],
            "type": fm["type"],
            "mirror": fm["mirror"],
            "vertices": fm["vertices"],
            "edges": fm["edges"],
            "neighbors": fm["neighbors"],
            "window": bool(fm.get("window")),
        }
        if fm["type"] == "doorHalf":
            out["parentHexId"] = fm["parentHexId"]
            out["doorDims_mm"] = fm["doorDims_mm"]
            out["edgeOrder"] = fm.get("edgeOrder", ["a", "b", "c"])
        public_faces.append(out)

    public_verts = [[round(c, 4) for c in v] for v in sverts]

    doc = {
        "meta": {
            "dome": "Trillium 5/8 3v",
            "units": "mm",
            "upAxis": "Z",
            "source": (
                "generated Class I frequency-3 icosahedral geodesic truncated to 5/8 "
                f"(keep face centroid z >= {factor} * R on unit sphere, Z-up); "
                "edge lengths locked to Trillium PDF / panel-specs.js (A=1155,B=1130,C=976)"
            ),
            "counts": {
                "hex": counts["hex"],
                "pent": counts["pent"],
                "doorHalf": counts["doorHalf"],
            },
            "countsDetail": counts,
            "classicBeforeDoors": {"hex": hex_n, "pent": pent_n, "other": other_n},
            "radius_mm": round(radius_mm, 4),
            "chordUnitLengths": {k: round(v, 8) for k, v in chord_info.items() if k != "scale"},
            "scale": round(chord_info["scale"], 6),
            "truncation": {
                "convention": f"Z-up; keep faces with centroid_z >= {factor} * R",
                "z_cut_factor": factor,
            },
            "doorAssignment": {
                "method": (
                    "Two adjacent lowest-Z hex faces removed and replaced by 4 doorHalf faces "
                    "(LH+RH per parent). Each doorHalf gets physical edges a/b/c from panel-specs "
                    "doorHalf(mirror): LH 986/577/1130, RH 577/986/1130 (mm), miters 1.4/59.3/29.3 "
                    "(RH swaps baseL/baseR). Placement: shared parent B-base (1130) with lowered "
                    "apex inside the hex (PDF partial-hex cut) — not a full A-A-B triangle. "
                    "LH and RH on the same parent do not reuse the same three hex edges."
                ),
                "edgeOrder": "faces[].edges = [a, b, c] matching doorDims_mm / doorHalf()",
                "parentHexIds": door_parents,
            },
            "windowAssignment": {
                "method": (
                    "PROVISIONAL until PDF section map. Heuristic: 4 hex faces in mid-upper "
                    "latitude band at ~90° azimuth spacing. PDF/TPM window section labels are NOT mapped yet."
                ),
                "provisional": True,
                "note": "provisional until PDF section map",
                "faceIds": window_ids,
            },
            "notes": [
                "Face ids (f0…) are generated indices — PDF exploded-view section numbers are NOT mapped. Assembler: face ids ≠ PDF exploded numbers.",
                "Window face IDs are provisional until PDF section map.",
                "Classic 3v 5/8 ≈ 75 hex + 30 pent; Trillium lists 73 hex after door cuts (75−2=73) + 4 door halves.",
                "Assembler must import dims from ./panel-specs.js — do not copy edge lengths from this file alone.",
                "doorHalf edges are physical DOOR lengths (986/577/1130 mm, mirrored), not parent hex A-A-B (1155/1155/1130).",
                f"Pre-door classification: hex={hex_n} pent={pent_n} other={other_n}.",
            ],
        },
        "vertices": public_verts,
        "edges": edges_out,
        "faces": public_faces,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(doc, indent=2) + "\n")
    print(f"Wrote {out_path}")
    print(f"radius_mm={radius_mm:.4f}")
    print(f"before doors: hex={hex_n} pent={pent_n} other={other_n} faces={len(faces_meta)}")
    print(f"after doors:  {counts}")
    print(f"doors parents={door_parents} windows={window_ids}")
    print(f"verts={len(public_verts)} edges={len(edges_out)} faces={len(public_faces)}")


if __name__ == "__main__":
    main()
