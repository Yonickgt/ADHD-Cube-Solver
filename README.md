# ADHD Cube Solver

A 3D Rubik's cube in your browser that solves itself one clear step at a time. Get a random, always-solvable scramble, then follow the CFOP method (Cross, F2L, OLL, PLL) with a single glowing next move and no walls of text. Step back and forth, play it at your own speed, or twist the cube by hand and keep going.

Built with [three.js](https://threejs.org) and [Vite](https://vitejs.dev). There is no backend.

## Features

- **Random scrambles.** Every scramble is a legal cube state. It can't produce an unsolvable position such as a single twisted corner.
- **CFOP solver.**
  - The cross is solved optimally from a pattern table.
  - F2L is solved pair by pair with IDA*.
  - OLL and PLL come from algorithm tables, and each algorithm is checked against its real effect on the cube before it is used.
  - The F2L moves are hand-friendly, using `y` rotations instead of awkward turns.
- **Step through the solve.** Use Previous and Next to move one turn at a time, or Full solve to play it all with an adjustable delay.
- **Hand turning.** Drag a face to twist a layer yourself. The solver re-reads the cube, so hand-turned moves still solve.
- **Scramble history.** Return to the previous scramble.
- **Signal-box UI.** The solution is drawn as a route across a railway signal-box panel. The lit rail marks finished stages and the amber lamp marks the next move.

## Quick start

Requires [Node.js](https://nodejs.org) 18 or newer.

```bash
git clone <repo-url>
cd <repo-folder>
npm install
npm run dev
```

Open the URL Vite prints, usually http://localhost:5173.

## Controls

| Action | Input |
|---|---|
| Twist a layer | Left-drag on the cube |
| Orbit the view | Right-drag |
| Step back or forward | **Previous** / **Next** |
| Play the whole solution | **Full solve** (speed set by the **Delay** slider) |
| New scramble | **Rescramble** |
| Go back one scramble | **Previous scramble** |

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm test` | Run the engine, scheme and solver tests (`node --test`) |

## Project structure

```
index.html        page shell
src/
  engine.js       pure cube model (no three.js): state, moves, scrambling
  solver.js       CFOP solver
  algs.js         OLL / PLL algorithm tables
  cube.js         three.js cube renderer
  turn.js         drag-to-twist input
  panel.js        signal-box solution panel
  scheme.js       colour scheme
  main.js         app wiring
  style.css
test/             node:test suites
public/           static assets
```

## Notes

- The page loads fonts from Google Fonts, so you need internet access for them. Without it the page falls back to system fonts.
- The solver assumes the cross on the white (D) face and yellow on top.
- Moves use standard WCA notation.
