# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + vanilla JS + Three.js (already in place; user asked for Three.js).

## Users

Cubers at a desk, cube in hand, replicating the on-screen scramble on a physical 3x3, then following the CFOP solve to compare against their own solving. Primary audience confirmed as experienced speedcubers who want a reference, not hand-holding.

## Product Purpose

Load a random, always-solvable 3x3 scramble (shown in WCA notation so it can be copied onto a physical cube), then show a full CFOP solve (Cross, F2L, OLL, PLL) with every algorithm named and written in notation. Success: the solve is correct, each stage and alg is legible, and the user can step through it one move at a time.

## Positioning

Not a black-box solver: it solves the way a human CFOP solver does, stage by stage, naming each case and alg (OLL/PLL case names, F2L pairs, triggers like sexy move / sledgehammer) so it works as a study reference.

## Operating Context

Cube-in-hand. Orientation fixed: yellow top, white bottom, green front (non-mirrored, rotation of the standard scheme). Cuber terminology: Cross, F2L, OLL, PLL, AUF, pair, slot, trigger, case names (e.g. T-perm, Sune).

## Capabilities and Constraints

- 3x3 only. Three.js canvas; left button drags a layer, right button orbits, wheel zooms.
- Scramble generator must produce only reachable states (valid corner twist, edge flip, permutation parity) via random moves.
- Controls: Previous, Next (single move), Full solve (play to end), Rescramble.
- Left panel: CFOP stages, current stage/alg in notation, brief terse explanation, cuber terms glossary.
- Push to git only when the user says so.

## Evidence on Hand

No existing brand, copy or assets. Alg names/notations come from the standard cubing community sets (to be verified by solving tests).

## Product Principles

1. Correctness first: every step and alg shown is verified by tests against a real cube model.
2. Speak the cuber's language: WCA notation, standard case names, no dumbing down.
3. The cube is the hero; the interface stays out of its way.
4. Every algorithm on screen is real, named and tracked move by move.

## Accessibility & Inclusion

Keyboard-operable controls, visible focus, sufficient contrast; color is never the only carrier of stage state.
