import test from 'node:test';
import assert from 'node:assert/strict';
import { SOLVED, apply, isSolved, randomScramble, invertAlg, parseAlg, normalise } from '../src/engine.js';
import { solve, f2lSolved, crossSolved, ollSolved } from '../src/solver.js';
import { OLL, PLL, EO } from '../src/algs.js';

test('every table algorithm leaves the first two layers intact', () => {
  for (const [alg, name] of [...OLL, ...EO, ...PLL]) assert.ok(f2lSolved(apply(SOLVED, alg)), `${name || ''} ${alg}`);
});

const played = st => st.play.filter(p => p.orig).map(p => p.orig); // y rotations turn nothing on the cube

test('solves 400 random scrambles; F2L is hand-friendly (only R/U/F or L/U/F plus y rotations)', () => {
  for (let i = 0; i < 400; i++) {
    const start = apply(SOLVED, randomScramble());
    const steps = solve(start);
    let s = start;
    for (const st of steps) {
      s = apply(s, played(st));
      assert.equal(st.moves.join(' '), st.alg.trim(), 'displayed alg equals the moves played');
      if (st.stage === 'Cross') assert.ok(crossSolved(s));
      if (st.stage === 'F2L') {
        assert.ok(!st.awkward, 'no awkward F2L pair');
        const faces = new Set(st.moves.filter(m => !/^y/.test(m)).map(m => m[0]));
        assert.ok(![...faces].some(f => 'BD'.includes(f)), `F2L step uses ${[...faces]}`);
        assert.ok(!(faces.has('R') && faces.has('L')), 'never R and L in the same pair');
      }
    }
    assert.ok(isSolved(s));
    const order = steps.map(x => x.stage), rank = { Cross: 0, F2L: 1, OLL: 2, PLL: 3 };
    assert.deepEqual(order, [...order].sort((a, b) => rank[a] - rank[b]), 'stages appear in CFOP order');
  }
});

test('stage boundaries: after F2L the cross+pairs are solved, after OLL the top is yellow', () => {
  const start = apply(SOLVED, randomScramble());
  let s = start;
  const steps = solve(start);
  steps.forEach((st, i) => {
    s = apply(s, played(st));
    const next = steps[i + 1];
    if (st.stage === 'F2L' && next?.stage !== 'F2L') assert.ok(f2lSolved(s));
    if (st.stage === 'OLL' && next?.stage !== 'OLL') assert.ok(ollSolved(s));
  });
});

test('every PLL alg is recognised from its own case', () => {
  for (const [alg, name] of PLL) {
    const steps = solve(apply(SOLVED, invertAlg(parseAlg(alg))));
    assert.ok(steps.some(x => x.stage === 'PLL' && x.name === name), `${name}`);
  }
});

test('a cube with a hand-turned middle slice (centres moved) still solves', () => {
  for (let i = 0; i < 60; i++) {
    const raw = apply(apply(SOLVED, randomScramble()), [['M', "M'", 'M2'][i % 3]]), start = normalise(raw);
    let s = start;
    for (const st of solve(start)) s = apply(s, played(st));
    assert.ok(isSolved(s));
  }
});

test('an already-solved cube yields no steps', () => assert.deepEqual(solve(SOLVED), []));
