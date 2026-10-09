# 3x3 Rubik's Cube Solver Visualizer — Plan

Stack: Three.js + Vite, vanilla JS. 3x3 only.

## Orientation (never mirrored)
Standard scheme is white-top/green-front/red-right. We rotate the whole cube 180° about the
front–back axis (a rotation, so chirality is preserved):
**U yellow, D white, F green, B blue, R orange, L red.** Move notation (U D L R F B) refers to faces by
position, so all algorithms stay valid unchanged.

## Phases
1. **Cube render** (this phase): 27 cubies, accurate colors, orbit-by-drag only. Verify colors/layout.
2. **Scrambler**: cube state model (facelets + move application), random scramble, page loads scrambled, notation displayed.
3. **Move animation**: animated 90°/180° face turns via pivot groups, queue.
4. **CFOP solver**: cross → F2L → OLL → PLL; each step emits `{stage, alg, moves}`; every alg shown by name + notation.
5. **Controls + polish**: Prev / Next / Play-to-end, speed, step list, responsive dark UI, a11y.

## Verification (agent-run)
- `node --test`: color scheme, move permutations (4× = identity, move·inverse), solver solves 1000 random scrambles.
- `vite build` passes.
- Real-browser checks (screenshots, clean console, drag orbits, click does not turn).
