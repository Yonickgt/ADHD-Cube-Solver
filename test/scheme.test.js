import test from 'node:test';
import assert from 'node:assert/strict';
import { FACES, stickerFaces } from '../src/scheme.js';

const W = 0xffffff, Y = 0xffd500, G = 0x009b48, B = 0x0045ad, R = 0xb71234, O = 0xff5800;
// Standard Western scheme (white top, green front, red right, orange left).
const STANDARD = { U: W, D: Y, F: G, B: B, R: R, L: O };
// Rotating the standard cube 180° about the F–B axis sends U<->D and L<->R, F/B fixed.
const ROT_Z180 = { U: 'D', D: 'U', L: 'R', R: 'L', F: 'F', B: 'B' };

test('scheme is the standard cube rotated 180° about F–B (a rotation, never a mirror)', () => {
  for (const f of Object.keys(FACES)) assert.equal(FACES[f].color, STANDARD[ROT_Z180[f]], f);
  assert.equal(FACES.U.color, Y); // yellow top
  assert.equal(FACES.D.color, W); // white bottom
});

test('sticker counts: 6 centers, 12 edges, 8 corners, 54 total', () => {
  const n = { 1: 0, 2: 0, 3: 0 }; let total = 0;
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const k = stickerFaces([x, y, z]).length; total += k; if (k) n[k]++;
  }
  assert.deepEqual(n, { 1: 6, 2: 12, 3: 8 });
  assert.equal(total, 54);
});
