import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCube, readState } from './cube.js';
import { turnLayer, isTurning } from './turn.js';
import { parseMove, randomScramble, invertMove, normalise } from './engine.js';
import { solve } from './solver.js';
import { createPanel } from './panel.js';

const host = document.getElementById('canvas-host');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const canvas = renderer.domElement;
host.appendChild(canvas);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151618);
// Soft, even lighting (including from below) so the white bottom reads white.
scene.add(new THREE.AmbientLight(0xffffff, 1.5));
scene.add(new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6));
for (const p of [[4, 7, 6], [-5, -6, -4]]) { const l = new THREE.DirectionalLight(0xffffff, 1.1); l.position.set(...p); scene.add(l); }

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(5.2, 4.6, 6.4);

// Left button = twist a layer (drag on a tile), right button = orbit, wheel = zoom.
const controls = new OrbitControls(camera, canvas);
controls.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
canvas.addEventListener('contextmenu', e => e.preventDefault());
controls.enablePan = false; controls.enableDamping = true;
controls.minDistance = 5; controls.maxDistance = 20;

// ---- model ----
let cube, scramble = [], steps = [], moves = [], cursor = 0, playing = false, lock = false;
const $ = id => document.getElementById(id);
const panel = createPanel($('panel'), $('scramble'), ['btn-prev', 'btn-next', 'btn-play'].map($));
const render = () => panel.render({ scramble, steps, moves, cursor, playing });

const doMove = (tok, ms) => { const { axis, layers, quarters } = parseMove(tok); return turnLayer(cube, axis, layers, quarters, ms); };

function setCube() {
  if (cube) scene.remove(cube);
  cube = buildCube(); scene.add(cube); window.__cube = cube; window.__camera = camera; window.__state = () => readState(cube);
}
function plan() { // solve whatever the cube looks like right now
  steps = solve(normalise(readState(cube))); // normalise: a hand-turned middle slice moves the centres
  moves = steps.flatMap((s, si) => s.play.map((p, mi) => ({ ...p, si, mi }))); // p = { tok: hand notation, orig: cube move | null for y }
  cursor = 0; window.__steps = steps; render(); // __steps: handle for browser checks
}
const history = []; // scrambles already shown, most recent last
function loadScramble(toks) {
  playing = false; scramble = toks; setCube(); camera.position.set(5.2, 4.6, 6.4); // hand notation assumes the standard view
  scramble.forEach(t => doMove(t, 0));
  $('btn-prevscr').disabled = !history.length;
  plan();
}
function rescramble() { if (scramble.length) history.push(scramble); loadScramble(randomScramble()); }

async function step(dir, ms = 260) {
  if (lock || isTurning() || (dir > 0 ? cursor >= moves.length : cursor <= 0)) return false;
  lock = true;
  const m = dir > 0 ? moves[cursor] : moves[cursor - 1];
  cursor += dir; render();
  await (m.orig ? doMove(dir > 0 ? m.orig : invertMove(m.orig), ms) : spinView(m.tok, dir, ms));
  lock = false; return true;
}
// A whole-cube rotation (y, y2, y') is shown by orbiting the view, so the notation always matches what faces you.
function spinView(tok, dir, ms) {
  const total = ({ y: 1, y2: 2, "y'": -1 })[tok] * dir * Math.PI / 2, t0 = performance.now(); let done = 0;
  return new Promise(resolve => {
    const tick = now => {
      const k = Math.min((now - t0) / (ms * 1.8), 1), a = total * (1 - (1 - k) ** 3);
      camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), a - done); done = a;
      if (k < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });
}
async function togglePlay() {
  if (playing) { playing = false; render(); return; }
  playing = true; render();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  while (playing && cursor < moves.length) { await sleep((await step(1, 180)) ? delay : 40); } // delay = pause between moves
  playing = false; render();
}
// Delay slider: pause between moves while Full solve plays. Remembered per browser; works without storage.
let delay = 200;
try { delay = Math.min(1500, Math.max(0, +localStorage.getItem('delay') || 200)); } catch { /* storage blocked */ }
$('delay').value = delay; $('delay-out').textContent = `${delay} ms`;
$('delay').oninput = e => {
  delay = +e.target.value; $('delay-out').textContent = `${delay} ms`;
  try { localStorage.setItem('delay', delay); } catch { /* storage blocked */ }
};
$('btn-prev').onclick = () => { if (!playing) step(-1); };
$('btn-next').onclick = () => { if (!playing) step(1); };
$('btn-play').onclick = togglePlay;
$('btn-scramble').onclick = () => { if (!lock && !isTurning()) rescramble(); };
$('btn-prevscr').onclick = () => { if (!lock && !isTurning() && history.length) loadScramble(history.pop()); };
addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && !playing) step(1);
  else if (e.key === 'ArrowLeft' && !playing) step(-1);
});

// ---- drag a tile to twist its layer ----
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
const toScreen = v => { const p = v.clone().project(camera); return new THREE.Vector2(p.x * canvas.clientWidth / 2, -p.y * canvas.clientHeight / 2); }; // true pixels
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0 || isTurning() || lock) return;
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(cube, true).find(h => h.object.userData.face);
  if (!hit) return;
  controls.enabled = false;
  const n = hit.object.getWorldDirection(new THREE.Vector3()).round(), p = hit.point.clone();
  drag = { x: e.clientX, y: e.clientY, n, p };
});
addEventListener('pointermove', async e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(dx, dy) < 12) return;
  const { n, p } = drag; drag = null;
  playing = false;
  const move = new THREE.Vector2(dx, dy).normalize();
  let best = null; // face-tangent axis whose on-screen direction best matches the drag
  for (const t of [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map(a => new THREE.Vector3(...a)).filter(a => a.dot(n) === 0)) {
    const d = toScreen(p.clone().add(t)).sub(toScreen(p)).normalize().dot(move);
    if (!best || Math.abs(d) > Math.abs(best.d)) best = { t, d };
  }
  const axis = n.clone().cross(best.t.clone().multiplyScalar(Math.sign(best.d)));
  lock = true;
  window.__lastTwist = { layer: Math.round(p.dot(axis)) }; // browser-check handle
  await turnLayer(cube, axis.toArray(), Math.round(p.dot(axis)), 1);
  lock = false; plan(); // the route is re-planned from wherever the cube now is
});
addEventListener('pointerup', () => { drag = null; controls.enabled = true; });

function resize() {
  const { clientWidth: w, clientHeight: h } = host;
  renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); resize();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

rescramble();
