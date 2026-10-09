import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FACES, stickerFaces } from './scheme.js';

const body = new RoundedBoxGeometry(0.97, 0.97, 0.97, 4, 0.08);
const bodyMat = new THREE.MeshLambertMaterial({ color: 0x0b0b0d });

function stickerGeometry(size = 0.82, r = 0.1) {
  const h = size / 2, s = new THREE.Shape();
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.quadraticCurveTo(h, -h, h, -h + r);
  s.lineTo(h, h - r); s.quadraticCurveTo(h, h, h - r, h);
  s.lineTo(-h + r, h); s.quadraticCurveTo(-h, h, -h, h - r);
  s.lineTo(-h, -h + r); s.quadraticCurveTo(-h, -h, -h + r, -h);
  const g = new THREE.ShapeGeometry(s), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / size + 0.5, p.getY(i) / size + 0.5); // 0..1 across the sticker
  return g;
}
const stickerGeo = stickerGeometry();

// The cat goes on every white sticker. The 736x774 source is mostly white margin, so crop a 470px square around the cat
// (centre ~410,390 px from top-left), which also drops the thin grey edge line.
const catTex = new THREE.TextureLoader().load('/cat.jpg', t => {
  const { width: w, height: h } = t.image, s = 470, cx = 410, cy = 390;
  t.repeat.set(s / w, s / h); t.offset.set((cx - s / 2) / w, 1 - (cy + s / 2) / h);
});
catTex.colorSpace = THREE.SRGBColorSpace; catTex.anisotropy = 8;

// Returns a Group of 27 cubies; each cubie.userData.pos holds its integer grid coords.
export function buildCube() {
  const cube = new THREE.Group();
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const cubie = new THREE.Group();
    cubie.position.set(x, y, z);
    cubie.userData.pos = [x, y, z];
    cubie.add(new THREE.Mesh(body, bodyMat));
    for (const f of stickerFaces([x, y, z])) {
      const { normal, color } = FACES[f];
      const m = new THREE.Mesh(stickerGeo, new THREE.MeshLambertMaterial(f === 'D' ? { color, map: catTex } : { color }));
      const n = new THREE.Vector3(...normal);
      m.position.copy(n).multiplyScalar(0.486);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
      m.userData.face = f;
      cubie.add(m);
    }
    cube.add(cubie);
  }
  return cube;
}

// Keep every cat upright relative to the face it currently sits on: "up" is toward F on D, toward B on U, toward U on the sides.
// Without this, a sticker that arrives from another face (or a turned centre) shows its cat rotated.
const _m = new THREE.Matrix4(), _n = new THREE.Vector3(), _u = new THREE.Vector3(), _x = new THREE.Vector3();
export function alignCats(cube, animate = true) {
  cube.updateMatrixWorld(true);
  const jobs = [];
  for (const cubie of cube.children) for (const m of cubie.children) {
    if (m.userData.face !== 'D') continue;
    m.getWorldDirection(_n).round();
    _u.set(0, _n.y === -1 ? 0 : _n.y === 1 ? 0 : 1, _n.y === -1 ? 1 : _n.y === 1 ? -1 : 0);
    _x.crossVectors(_u, _n);
    _m.makeBasis(_x, _u, _n);
    const target = cubie.quaternion.clone().invert().multiply(new THREE.Quaternion().setFromRotationMatrix(_m)); // cube group is never rotated
    if (m.quaternion.angleTo(target) > 1e-3) jobs.push([m, m.quaternion.clone(), target]);
  }
  if (!jobs.length) return;
  if (!animate) { jobs.forEach(([m, , t]) => m.quaternion.copy(t)); return; }
  const t0 = performance.now(), tick = now => {
    const k = Math.min((now - t0) / 160, 1), e = 1 - (1 - k) ** 3;
    jobs.forEach(([m, from, to]) => m.quaternion.slerpQuaternions(from, to, e));
    if (k < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// Read the logical state (engine format) back from the 3D cube, so a hand-twisted cube can be re-solved.
import { FACE_IDS, stickerAt } from './engine.js';
export function readState(cube) {
  cube.updateMatrixWorld(true);
  const s = new Uint8Array(54), n = new THREE.Vector3();
  for (const cubie of cube.children) for (const m of cubie.children) {
    if (!m.userData.face) continue;
    m.getWorldDirection(n).round();
    s[stickerAt(cubie.userData.pos, n.toArray())] = FACE_IDS.indexOf(m.userData.face);
  }
  return s;
}
