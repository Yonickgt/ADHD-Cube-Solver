// Pure cube model (no three.js). State = Uint8Array(54): color id (= home face index in "URFDLB") per sticker.
// Coordinates match the renderer: +x R, +y U, +z F.
export const FACE_IDS = 'URFDLB';
const NORMALS = { U: [0, 1, 0], R: [1, 0, 0], F: [0, 0, 1], D: [0, -1, 0], L: [-1, 0, 0], B: [0, 0, -1] };

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Rotate v by quarters*90° (right-hand rule) about unit axis a.
function rot(v, a, quarters) {
  let r = v;
  for (let q = ((quarters % 4) + 4) % 4; q > 0; q--) {
    const d = dot(a, r), c = cross(a, r);
    r = [a[0] * d + c[0], a[1] * d + c[1], a[2] * d + c[2]];
  }
  return r;
}

// ---- stickers ----
export const STICKERS = []; // {p, n}
const keyOf = (p, n) => p.join(',') + '|' + n.join(',');
const stickerIndex = new Map();
for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
  for (const f of FACE_IDS) {
    const n = NORMALS[f];
    if (n[0] * x + n[1] * y + n[2] * z === 1) { stickerIndex.set(keyOf([x, y, z], n), STICKERS.length); STICKERS.push({ p: [x, y, z], n }); }
  }
}
export const stickerAt = (p, n) => stickerIndex.get(keyOf(p, n));
export const SOLVED = Uint8Array.from(STICKERS, ({ n }) => FACE_IDS.indexOf(Object.keys(NORMALS).find(f => NORMALS[f].every((v, i) => v === n[i]))));

// ---- moves ----
// spec: axis (unit), layers (values of p·axis), q = right-hand quarter turns for the base (clockwise-face) move.
// A face move turns clockwise viewed from outside = -90° about its outward normal.
const BASE = {
  U: { axis: NORMALS.U, layers: [1], q: -1 }, D: { axis: NORMALS.D, layers: [1], q: -1 },
  R: { axis: NORMALS.R, layers: [1], q: -1 }, L: { axis: NORMALS.L, layers: [1], q: -1 },
  F: { axis: NORMALS.F, layers: [1], q: -1 }, B: { axis: NORMALS.B, layers: [1], q: -1 },
  M: { axis: [1, 0, 0], layers: [0], q: 1 },  // follows L
  r: { axis: [1, 0, 0], layers: [1, 0], q: -1 }, l: { axis: [-1, 0, 0], layers: [1, 0], q: -1 },
  f: { axis: [0, 0, 1], layers: [1, 0], q: -1 }, b: { axis: [0, 0, -1], layers: [1, 0], q: -1 },
  u: { axis: [0, 1, 0], layers: [1, 0], q: -1 }, d: { axis: [0, -1, 0], layers: [1, 0], q: -1 },
};

export function parseMove(tok) {
  const base = BASE[tok[0]];
  if (!base || tok.length > 2 || (tok.length === 2 && !"'2".includes(tok[1]))) throw new Error('bad move ' + tok);
  const amt = tok[1] === '2' ? 2 : tok[1] === "'" ? -1 : 1; // clockwise-count
  return { tok, axis: base.axis, layers: base.layers, quarters: base.q * amt }; // quarters: right-hand about axis
}
export const parseAlg = s => s.trim().split(/\s+/).filter(Boolean);

const permCache = new Map();
export function permOf(tok) {
  let p = permCache.get(tok);
  if (p) return p;
  const { axis, layers, quarters } = parseMove(tok);
  p = new Uint8Array(54);
  STICKERS.forEach(({ p: pos, n }, i) => {
    p[i] = layers.includes(dot(pos, axis)) ? stickerAt(rot(pos, axis, quarters), rot(n, axis, quarters)) : i;
  });
  permCache.set(tok, p);
  return p;
}

export function apply(state, algOrToks) {
  const toks = typeof algOrToks === 'string' ? parseAlg(algOrToks) : algOrToks;
  let s = state;
  for (const t of toks) { const p = permOf(t), n = new Uint8Array(54); for (let i = 0; i < 54; i++) n[p[i]] = s[i]; s = n; }
  return s;
}

export const invertMove = t => t.length === 1 ? t + "'" : t[1] === "'" ? t[0] : t;
export const invertAlg = toks => toks.slice().reverse().map(invertMove);
export const isSolved = s => s.every((c, i) => c === SOLVED[i]);

// ---- pieces (for validity + solver) ----
// Corner position c: stickers ordered right-handed, starting with the one on U/D. Slot = 3*c + k. Edge slot = 2*e + k, k=0 is
// the U/D sticker (or F/B sticker for middle-layer edges).
export const CORNER_STICKERS = [], EDGE_STICKERS = [];
export const cornerSlotOf = new Int8Array(54).fill(-1), edgeSlotOf = new Int8Array(54).fill(-1);
{
  const byCubie = new Map();
  STICKERS.forEach(({ p }, i) => { const k = p.join(','); (byCubie.get(k) || byCubie.set(k, []).get(k)).push(i); });
  for (const idx of byCubie.values()) {
    if (idx.length === 3) {
      let o = idx.slice().sort((a, b) => Math.abs(STICKERS[b].n[1]) - Math.abs(STICKERS[a].n[1])); // U/D first
      if (dot(cross(STICKERS[o[0]].n, STICKERS[o[1]].n), STICKERS[o[2]].n) < 0) o = [o[0], o[2], o[1]];
      o.forEach((s, k) => cornerSlotOf[s] = CORNER_STICKERS.length * 3 + k);
      CORNER_STICKERS.push(o);
    } else if (idx.length === 2) {
      const pri = s => Math.abs(STICKERS[s].n[1]) * 2 + Math.abs(STICKERS[s].n[2]); // y first, then z
      const o = idx.slice().sort((a, b) => pri(b) - pri(a));
      o.forEach((s, k) => edgeSlotOf[s] = EDGE_STICKERS.length * 2 + k);
      EDGE_STICKERS.push(o);
    }
  }
}
// Home colors of each piece (piece id = home position index).
const homeCorner = CORNER_STICKERS.map(o => o.map(s => SOLVED[s]));
const homeEdge = EDGE_STICKERS.map(o => o.map(s => SOLVED[s]));

// Piece tuples: cornerSlot[q] = slot where piece q's reference (k=0) sticker sits; same for edges.
export function pieces(state) {
  const cs = new Int8Array(8), es = new Int8Array(12);
  for (let q = 0; q < 8; q++) {
    const [a, b, c] = homeCorner[q];
    for (let pos = 0; pos < 8; pos++) for (let k = 0; k < 3; k++) {
      const st = CORNER_STICKERS[pos];
      if (state[st[k]] === a && state[st[(k + 1) % 3]] === b && state[st[(k + 2) % 3]] === c) cs[q] = pos * 3 + k;
    }
  }
  for (let q = 0; q < 12; q++) {
    const [a, b] = homeEdge[q];
    for (let pos = 0; pos < 12; pos++) for (let k = 0; k < 2; k++) {
      const st = EDGE_STICKERS[pos];
      if (state[st[k]] === a && state[st[1 - k]] === b) es[q] = pos * 2 + k;
    }
  }
  return { cs, es };
}

const parity = perm => { let p = 0; const seen = []; perm.forEach((_, i) => { if (!seen[i]) { let j = i, len = 0; while (!seen[j]) { seen[j] = 1; j = perm[j]; len++; } p += len - 1; } }); return p & 1; };

// A state is reachable iff every piece exists once, corner twists sum to 0 mod 3, edge flips sum to 0 mod 2,
// and corner/edge permutation parities match.
export function isSolvable(state) {
  const { cs, es } = pieces(state);
  const cp = [...cs].map(s => Math.floor(s / 3)), ep = [...es].map(s => s >> 1);
  if (new Set(cp).size !== 8 || new Set(ep).size !== 12) return false;
  const counts = new Array(6).fill(0); state.forEach(c => counts[c]++);
  if (counts.some(n => n !== 9)) return false;
  const twist = [...cs].reduce((a, s) => a + (s % 3), 0), flip = [...es].reduce((a, s) => a + (s % 2), 0);
  return twist % 3 === 0 && flip % 2 === 0 && parity(cp) === parity(ep);
}

// A middle-slice turn moves the centres, which the solver treats as fixed. Relabel colours by where each centre now sits, so
// "the face whose centre is X" is what must end up uniform. (Slice turns only ever rotate the cube relative to its centres.)
const CENTER_AT = [...FACE_IDS].map(f => stickerAt(NORMALS[f], NORMALS[f]));
export function normalise(state) {
  const to = []; CENTER_AT.forEach((idx, face) => { to[state[idx]] = face; });
  return state.map(c => to[c]);
}

// ---- scramble ----
const FACES = 'URFDLB', AXIS = { U: 0, D: 0, R: 1, L: 1, F: 2, B: 2 };
export function randomScramble(len = 20, rnd = Math.random) {
  const out = []; let last = null, prev = null;
  while (out.length < len) {
    const f = FACES[Math.floor(rnd() * 6)];
    if (f === last) continue;
    if (prev && AXIS[f] === AXIS[last] && f === prev) continue; // no "U D U"
    out.push(f + ['', "'", '2'][Math.floor(rnd() * 3)]);
    prev = last; last = f;
  }
  return out;
}
