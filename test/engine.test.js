import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOLVED, apply, isSolved, isSolvable, randomScramble, invertAlg, parseAlg, stickerAt, normalise, CORNER_STICKERS, EDGE_STICKERS,
} from '../src/engine.js';

test('every move has order 4 and an inverse', () => {
  for (const m of ['U', 'R', 'F', 'D', 'L', 'B', 'M', 'r', 'f', 'u', 'd', 'l', 'b']) {
    assert.ok(isSolved(apply(SOLVED, [m, m, m, m])), m);
    assert.ok(isSolved(apply(apply(SOLVED, [m]), [m + "'"])), m + "'");
  }
  assert.ok(isSolved(apply(SOLVED, parseAlg("R U R' U' ".repeat(6)))), 'sexy move has order 6');
});

test('R turns clockwise: the F-facing sticker of the front-right column goes up to U', () => {
  const s = apply(SOLVED, ['R']);
  assert.equal(s[stickerAt([1, 1, 1], [0, 1, 0])], 2); // color id 2 = F
  assert.equal(s[stickerAt([1, 1, 0], [0, 1, 0])], 2);
});

test('1000 random scrambles are always solvable (no twisted corner / flipped edge / parity)', () => {
  for (let i = 0; i < 1000; i++) assert.ok(isSolvable(apply(SOLVED, randomScramble())));
});

test('the validity check rejects illegal cubes', () => {
  const c = CORNER_STICKERS[0], twisted = Uint8Array.from(SOLVED);
  [twisted[c[0]], twisted[c[1]], twisted[c[2]]] = [SOLVED[c[1]], SOLVED[c[2]], SOLVED[c[0]]];
  assert.ok(!isSolvable(twisted), 'single twisted corner');
  const e = EDGE_STICKERS[0], flipped = Uint8Array.from(SOLVED);
  [flipped[e[0]], flipped[e[1]]] = [SOLVED[e[1]], SOLVED[e[0]]];
  assert.ok(!isSolvable(flipped), 'single flipped edge');
  const swap = Uint8Array.from(SOLVED), a = EDGE_STICKERS[0], b = EDGE_STICKERS[1];
  a.forEach((s, k) => { swap[s] = SOLVED[b[k]]; swap[b[k]] = SOLVED[s]; });
  assert.ok(!isSolvable(swap), 'two swapped edges (parity)');
});

test('a hand-turned middle slice (centres moved) is normalised into a solvable state', () => {
  const moved = apply(SOLVED, ['M']);
  assert.ok(!isSolvable(moved), 'raw M state has displaced centres');
  assert.ok(isSolvable(normalise(moved)), 'relabelled by its centres it is a legal cube');
  assert.ok(!isSolved(normalise(moved)), 'but the slice is still out of place, so it is not solved');
  assert.ok(isSolved(normalise(SOLVED)), 'normalising a solved cube changes nothing');
});

test('scramble has no redundant consecutive turns and invertAlg undoes it', () => {
  const sc = randomScramble(25);
  assert.equal(sc.length, 25);
  sc.forEach((m, i) => i && assert.notEqual(m[0], sc[i - 1][0]));
  assert.ok(isSolved(apply(apply(SOLVED, sc), invertAlg(sc))));
  assert.deepEqual(parseAlg("R U2 R'"), ['R', 'U2', "R'"]);
});
