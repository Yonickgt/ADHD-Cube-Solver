// CFOP solver: Cross (optimal, via pattern table) -> F2L (pair-by-pair IDA*) -> OLL -> PLL (algorithm tables).
// Orientation: cross on D (white), yellow on U. solve(state) -> [{stage, label, name, alg, moves}].
import {
  SOLVED, STICKERS, CORNER_STICKERS, EDGE_STICKERS, cornerSlotOf, edgeSlotOf, permOf, apply, parseAlg, isSolved, pieces,
} from './engine.js';
import { OLL, EO, PLL } from './algs.js';

const D = 3, U = 0;
const FACE_NAME = ['yellow', 'orange', 'green', 'white', 'red', 'blue'];
const FACE_LETTER = 'URFDLB';
const ALL18 = [...'URFDLB'].flatMap(f => [f, f + "'", f + '2']);
const F2L_MOVES = [...'URFLB'].flatMap(f => [f, f + "'", f + '2']); // no D: keeps the cross where it is
const faceOf = t => 'URFDLB'.indexOf(t[0]);
const OPP = [3, 4, 5, 0, 1, 2];

// ---- ergonomics ----
// Hand frame k = the cube turned by k y-rotations. After one y, the face now in front (F) is the old R, new R is old B, etc.
const RING = ['F', 'R', 'B', 'L'];
const toOrig = (tok, k) => { const i = RING.indexOf(tok[0]); return i < 0 ? tok : RING[(i + k) % 4] + tok.slice(1); };
const toHand = (tok, k) => { const i = RING.indexOf(tok[0]); return i < 0 ? tok : RING[(i - k + 4) % 4] + tok.slice(1); };
const rotTok = d => ['', 'y', 'y2', "y'"][(d + 4) % 4]; // y rotations needed to go forward by d frames
// Rough cost of a turn for a human hand: R/U are home-row, F and L are fine, D awkward, B very awkward.
const W = { U: 1, R: 1, F: 1.2, L: 1.4, D: 1.8, B: 2.5 };
const turnCost = m => W[m[0]] || 1.5;

// ---- slot transition tables ----
const cDest = {}, eDest = {};
for (const m of ALL18) {
  const p = permOf(m), c = new Int8Array(24), e = new Int8Array(24);
  CORNER_STICKERS.forEach((st, pos) => st.forEach((s, k) => { c[pos * 3 + k] = cornerSlotOf[p[s]]; }));
  EDGE_STICKERS.forEach((st, pos) => st.forEach((s, k) => { e[pos * 2 + k] = edgeSlotOf[p[s]]; }));
  cDest[m] = c; eDest[m] = e;
}

// pieces whose colours contain D / the middle-layer edge matching each D corner
const homeColors = st => st.map(s => SOLVED[s]);
const crossEdges = EDGE_STICKERS.map((st, i) => i).filter(i => homeColors(EDGE_STICKERS[i]).includes(D));
const dCorners = CORNER_STICKERS.map((st, i) => i).filter(i => homeColors(CORNER_STICKERS[i]).includes(D));
const pairEdge = q => EDGE_STICKERS.findIndex(st => {
  const e = homeColors(st).slice().sort().join(), c = homeColors(CORNER_STICKERS[q]).filter(x => x !== D).sort().join();
  return e === c;
});
const PAIRS = dCorners.map(q => ({ corner: q, edge: pairEdge(q) }));

// ---- cross table: BFS over the slots of the 4 cross edges ----
let crossDist;
const ckey = (a, b, c, d) => a + 24 * (b + 24 * (c + 24 * d));
function buildCross() {
  crossDist = new Uint8Array(24 ** 4).fill(255);
  const home = crossEdges.map(e => e * 2);
  let frontier = [ckey(...home)]; crossDist[frontier[0]] = 0;
  for (let d = 0; frontier.length; d++) {
    const next = [];
    for (const k of frontier) {
      const s = [k % 24, Math.floor(k / 24) % 24, Math.floor(k / 576) % 24, Math.floor(k / 13824)];
      for (const m of ALL18) {
        const t = eDest[m], nk = ckey(t[s[0]], t[s[1]], t[s[2]], t[s[3]]);
        if (crossDist[nk] === 255) { crossDist[nk] = d + 1; next.push(nk); }
      }
    }
    frontier = next;
  }
}

function singleDist(home, dest) {
  const dist = new Uint8Array(24).fill(255); dist[home] = 0; let fr = [home];
  for (let d = 0; fr.length; d++) { const nx = []; for (const s of fr) for (const m of ALL18) { const n = dest[m][s]; if (dist[n] === 255) { dist[n] = d + 1; nx.push(n); } } fr = nx; }
  return dist;
}
function pairDist(hc, he) {
  const dist = new Uint8Array(576).fill(255), k0 = hc * 24 + he; dist[k0] = 0; let fr = [k0];
  for (let d = 0; fr.length; d++) {
    const nx = [];
    for (const k of fr) { const c = Math.floor(k / 24), e = k % 24; for (const m of ALL18) { const n = cDest[m][c] * 24 + eDest[m][e]; if (dist[n] === 255) { dist[n] = d + 1; nx.push(n); } } }
    fr = nx;
  }
  return dist;
}
let dC, dE, dP; // per-pair distance tables
function ensureTables() {
  if (crossDist) return;
  buildCross();
  dC = PAIRS.map(p => singleDist(p.corner * 3, cDest)); dE = PAIRS.map(p => singleDist(p.edge * 2, eDest));
  dP = PAIRS.map(p => pairDist(p.corner * 3, p.edge * 2));
}
export const warmUp = ensureTables;

export function crossSolved(s) { const { es } = pieces(s); return crossEdges.every(e => es[e] === e * 2); }
export function pairSolved(s, i) { const { cs, es } = pieces(s); return cs[PAIRS[i].corner] === PAIRS[i].corner * 3 && es[PAIRS[i].edge] === PAIRS[i].edge * 2; }
export const f2lSolved = s => crossSolved(s) && PAIRS.every((_, i) => pairSolved(s, i));
export const ollSolved = s => f2lSolved(s) && STICKERS.every(({ n }, i) => n[1] !== 1 || s[i] === U);
const pllUpToU = s => { for (let k = 0; k < 4; k++) if (isSolved(apply(s, Array(k).fill('U')))) return k; return -1; };

// ---- Cross ----
function solveCross(state) {
  const { es } = pieces(state);
  // Among all shortest crosses, pick the one that is cheapest for the hand (few B/D turns).
  const memo = new Map();
  const go = (slots, key) => {
    if (!crossDist[key]) return { c: 0, seq: [] };
    if (memo.has(key)) return memo.get(key);
    let best = null;
    for (const m of ALL18) {
      const t = eDest[m], ns = slots.map(s => t[s]), nk = ckey(...ns);
      if (crossDist[nk] !== crossDist[key] - 1) continue;
      const r = go(ns, nk), c = turnCost(m) + r.c;
      if (!best || c < best.c) best = { c, seq: [m, ...r.seq] };
    }
    memo.set(key, best); return best;
  };
  const slots = crossEdges.map(e => es[e]);
  return go(slots, ckey(...slots)).seq;
}

// ---- F2L: IDA* for the next pair (cross + earlier pairs preserved) ----
// `moves` restricts the turns allowed (original-frame tokens); returns the shortest {moves, pair} within maxLimit, or null.
function searchPair(t0, done, moves, maxLimit) {
  const cand = [0, 1, 2, 3].filter(i => !done.includes(i));
  const path = [];
  const pairH = (t, i) => Math.max(dC[i][t[4 + i]], dE[i][t[8 + i]], dP[i][t[4 + i] * 24 + t[8 + i]]);
  const h = t => {
    let v = crossDist[ckey(t[0], t[1], t[2], t[3])];
    for (const i of done) v = Math.max(v, pairH(t, i));
    let m = 99; for (const i of cand) m = Math.min(m, pairH(t, i));
    return Math.max(v, m);
  };
  const goal = t => {
    if (crossDist[ckey(t[0], t[1], t[2], t[3])] !== 0) return -1;
    for (const i of done) if (pairH(t, i) !== 0) return -1;
    for (const i of cand) if (pairH(t, i) === 0) return i;
    return -1;
  };
  let found = -1;
  const dfs = (t, g, limit, lastFace) => {
    if (g + h(t) > limit) return false;
    if (g === limit) { found = goal(t); return found >= 0; }
    for (const m of moves) {
      const f = faceOf(m);
      if (f === lastFace || (lastFace >= 0 && f === OPP[lastFace] && f < lastFace)) continue;
      const ce = eDest[m], cc = cDest[m], n = new Int8Array(12);
      for (let i = 0; i < 4; i++) n[i] = ce[t[i]];
      for (let i = 4; i < 8; i++) n[i] = cc[t[i]];
      for (let i = 8; i < 12; i++) n[i] = ce[t[i]];
      path.push(m);
      if (dfs(n, g + 1, limit, f)) return true;
      path.pop();
    }
    return false;
  };
  for (let limit = 0; limit <= maxLimit; limit++) { path.length = 0; if (dfs(t0, 0, limit, -1)) return { moves: path.slice(), pair: found }; }
  return null;
}

const slotName = i => {
  const c = homeColors(CORNER_STICKERS[PAIRS[i].corner]).filter(x => x !== D);
  return { faces: c.map(x => FACE_LETTER[x]).sort((a, b) => 'FRBL'.indexOf(a) - 'FRBL'.indexOf(b)).join(''), colors: c.map(x => FACE_NAME[x]).join('–') };
};

// ---- algorithm stages ----
const AUF = [[], ['U'], ['U2'], ["U'"]];
const llEdgeCount = s => EDGE_STICKERS.filter(st => STICKERS[st[0]].n[1] === 1 && s[st[0]] === U).length;
const llCornerCount = s => CORNER_STICKERS.filter(st => STICKERS[st[0]].n[1] === 1 && s[st[0]] === U).length;
const llEdgesOriented = s => llEdgeCount(s) === 4;

// cheapest (pre-AUF + alg) whose actual result satisfies goal
function bestAlg(state, algs, goal) {
  let best = null;
  for (const pre of AUF) for (const [alg, name] of algs) {
    const toks = parseAlg(alg), s = apply(state, [...pre, ...toks]);
    if (!goal(s)) continue;
    const cost = toks.length + pre.length * 0.5;
    if (!best || cost < best.cost) best = { pre, toks, alg, name, cost };
  }
  return best;
}

const ollTitle = s => {
  const up = EDGE_STICKERS.filter(st => STICKERS[st[0]].n[1] === 1 && s[st[0]] === U).map(st => STICKERS[st[0]].p);
  const c = llCornerCount(s);
  const eo = up.length === 0 ? 'Dot' : up.length === 4 ? 'Cross' : up.length === 2 ? (up[0][0] + up[1][0] === 0 && up[0][2] + up[1][2] === 0 ? 'Line' : 'L-shape') : 'Edges';
  return `${eo} · ${c} corner${c === 1 ? '' : 's'} oriented`;
};

export function solve(state) {
  ensureTables();
  const steps = []; let s = state;
  // toks are in hand notation for frame k (k y-rotations from the fixed frame); rotation tokens (y, y2, y') turn nothing on the cube.
  const push = (stage, label, name, toks, extra = {}, k = 0) => {
    const play = toks.map(tok => ({ tok, orig: /^y/.test(tok) ? null : toOrig(tok, k) }));
    steps.push({ stage, label, name, alg: toks.join(' '), moves: toks, play, ...extra });
    s = apply(s, play.filter(p => p.orig).map(p => p.orig));
  };
  const pushAlg = (stage, label, b, fallbackName) => {
    if (b.pre.length) push(stage, 'AUF', 'Adjust the U layer', b.pre);
    push(stage, label, b.name || fallbackName, b.toks, { alg: b.alg });
  };

  const cx = solveCross(s);
  if (cx.length) push('Cross', 'Cross', `${cx.length}-move cross, optimal`, cx);

  // F2L the way fast solvers do it: work in the front-right slot with only R U F (or the mirror, front-left, with L U F),
  // and turn the whole cube with y between pairs instead of reaching for B or D. Pick the pair/rotation with the fewest total moves.
  const done = []; let h = 0; // h = current hand frame
  while (done.length < 4) {
    const { cs, es } = pieces(s);
    const t0 = Int8Array.from([...crossEdges.map(e => es[e]), ...PAIRS.map(p => cs[p.corner]), ...PAIRS.map(p => es[p.edge])]);
    let best = null;
    for (const cap of [8, 10]) { // ergonomic pairs are short; try a deeper pass before giving up on them
      for (let k = 0; k < 4; k++) for (const side of ['R', 'L']) {
        const rot = k === h ? 0 : 1, limit = (best ? best.cost - 1 : cap) - rot;
        if (limit < 0) continue;
        const set = ['U', side, 'F'].flatMap(f => [f, f + "'", f + '2']).map(m => toOrig(m, k));
        const r = searchPair(t0, done, set, limit);
        if (r && (!best || r.moves.length + rot < best.cost)) best = { ...r, k, cost: r.moves.length + rot };
      }
      if (best) break;
    }
    let hand;
    if (best) hand = best.moves.map(m => toHand(m, best.k));
    else { // rare: a piece is stuck where only B/L/D can reach it; fall back to any non-D turn, written in the current frame
      const r = searchPair(t0, done, F2L_MOVES, 12);
      if (!r) throw new Error('F2L search failed');
      best = { ...r, k: h }; hand = r.moves.map(m => toHand(m, h)); best.awkward = true;
    }
    if (best.moves.length) {
      const nm = slotName(best.pair), rot = best.k === h ? [] : [rotTok(best.k - h)];
      push('F2L', `Pair ${done.length + 1} · ${nm.faces}`, `${nm.colors} corner + edge${rot.length ? ' · rotate first' : ''}`,
        [...rot, ...hand], { slot: nm.faces, awkward: !!best.awkward }, best.k);
      h = best.k;
    }
    done.push(best.pair);
  }
  if (h) push('F2L', 'Rotate', 'Back to the standard orientation', [rotTok(-h)], {}, 0);

  if (!ollSolved(s)) {
    const title = ollTitle(s), b = bestAlg(s, OLL, ollSolved);
    if (b) pushAlg('OLL', 'OLL', b, title);
    else { // two-look fallback: orient edges, then corners
      for (let i = 0; i < 3 && !llEdgesOriented(s); i++) {
        const cur = s, b2 = bestAlg(cur, EO, t => f2lSolved(t) && llEdgeCount(t) > llEdgeCount(cur));
        if (!b2) break;
        pushAlg('OLL', 'OLL · edges', b2, 'Orient edges');
      }
      const ocll = OLL.filter(([, n]) => ['Sune', 'Anti-Sune', 'H', 'Pi', 'Headlights', 'Chameleon', 'Bowtie'].includes(n));
      for (let i = 0; i < 3 && !ollSolved(s); i++) {
        const b3 = bestAlg(s, ocll, ollSolved) || bestAlg(s, [ocll[0]], t => f2lSolved(t) && llEdgesOriented(t));
        if (!b3) break;
        pushAlg('OLL', 'OLL · corners', b3, 'Orient corners');
      }
    }
  }

  let k = pllUpToU(s);
  if (k < 0) {
    const b = bestAlg(s, PLL, t => pllUpToU(t) >= 0);
    if (!b) throw new Error('PLL case not covered');
    pushAlg('PLL', 'PLL', b, 'PLL');
    k = pllUpToU(s);
  }
  if (k > 0) push('PLL', 'AUF', 'Final U turn', [['', 'U', 'U2', "U'"][k]]);
  if (!isSolved(s)) throw new Error('solve ended unsolved');
  return steps;
}
