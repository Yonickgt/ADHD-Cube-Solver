import * as THREE from 'three';
import { alignCats } from './cube.js';

let busy = false;
export const isTurning = () => busy;

// Rotate the cubies whose pos·axis is in `layers` by quarters*90° (right-hand rule) about `axis`.
// ms = 0 applies the turn instantly (used for the scramble). Positions are re-snapped to the grid afterwards.
export function turnLayer(cube, axis, layers, quarters, ms = 220) {
  busy = true;
  const a = new THREE.Vector3(...axis), ls = [].concat(layers);
  const pivot = new THREE.Group();
  cube.add(pivot);
  cube.children.filter(c => c.userData.pos && ls.includes(Math.round(new THREE.Vector3(...c.userData.pos).dot(a))))
    .forEach(c => pivot.attach(c));
  const total = quarters * Math.PI / 2, t0 = performance.now();
  const finish = () => {
    pivot.setRotationFromAxisAngle(a, total);
    [...pivot.children].forEach(c => { cube.attach(c); c.position.round(); c.userData.pos = c.position.toArray(); });
    cube.remove(pivot); busy = false; alignCats(cube, ms > 0);
  };
  if (!ms) { finish(); return Promise.resolve(); }
  return new Promise(resolve => {
    const step = now => {
      const k = Math.min((now - t0) / ms, 1), e = 1 - (1 - k) ** 3;
      if (k < 1) { pivot.setRotationFromAxisAngle(a, total * e); return requestAnimationFrame(step); }
      finish(); resolve();
    };
    requestAnimationFrame(step);
  });
}
