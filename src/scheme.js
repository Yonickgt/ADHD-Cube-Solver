// Classic cube rotated 180° about the F–B axis (rotation, not mirror): yellow top, white bottom.
// Face -> outward normal in three.js coords (+X right, +Y up, +Z toward viewer).
export const FACES = {
  U: { normal: [0, 1, 0],  color: 0xffd500 }, // yellow
  D: { normal: [0, -1, 0], color: 0xffffff }, // white
  F: { normal: [0, 0, 1],  color: 0x009b48 }, // green
  B: { normal: [0, 0, -1], color: 0x0045ad }, // blue
  R: { normal: [1, 0, 0],  color: 0xff5800 }, // orange
  L: { normal: [-1, 0, 0], color: 0xb71234 }, // red
};

// Which faces a cubie at integer coords (x,y,z in -1..1) shows stickers on.
export function stickerFaces([x, y, z]) {
  return Object.entries(FACES)
    .filter(([, { normal: [nx, ny, nz] }]) => nx * x + ny * y + nz * z === 1)
    .map(([name]) => name);
}
