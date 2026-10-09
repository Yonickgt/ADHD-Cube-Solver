// Algorithm tables (WCA notation, yellow top / white bottom, cross on D). Every entry is checked by test/solver.test.js:
// it must keep F2L intact, and the solver only ever emits an alg after checking its actual effect on the cube.
// `name` is only set where the nickname is unambiguous; case numbers are not asserted.

const rot = (alg, map) => alg.split(' ').map(t => (map[t[0]] || t[0]) + t.slice(1)).join(' ');
const Y_ROT = { F: 'R', R: 'B', B: 'L', L: 'F' }; // moves written after a y rotation, in the original frame
const X_PRIME = { U: 'B', B: 'D', D: 'F', F: 'U' }; // moves written after an x' rotation, in the original frame

// 1-look OLL. [alg, optional nickname].
export const OLL = [
  ["R U R' U R U2 R'", 'Sune'], ["R U2 R' U' R U' R'", 'Anti-Sune'],
  ["R U2 R' U' R U R' U' R U' R'", 'H'], ["R U2 R2 U' R2 U' R2 U2 R", 'Pi'],
  ["R2 D R' U2 R D' R' U2 R'", 'Headlights'], ["r U R' U' r' F R F'", 'Chameleon'], ["F' r U R' U' r' F R", 'Bowtie'],
  ["R U2 R2 F R F' U2 R' F R F'"], ["F R U R' U' F' f R U R' U' f'"],
  ["f R U R' U' f' U' F R U R' U' F'"], ["f R U R' U' f' U F R U R' U' F'"],
  ["r' U2 R U R' U r"], ["r U2 R' U' R U' r'"], ["r U R' U R U2 r'"], ["r' U' R U' R' U2 r"],
  ["R U R' U' R' F R2 U R' U' F'"], ["R U R' U R' F R F' R U2 R'"], ["r U R' U R' F R F' R U2 r'"],
  ["F R U R' U' F' U F R U R' U' F'"], ["F U R U' R2 F' R U R U' R'"], ["R' F R U R' F' R F U' F'"],
  ["r' U' r R' U' R U r' U r"], ["r U r' R U R' U' r U' r'"],
  ["R U R' U R' F R F' U2 R' F R F'"], ["r U R' U R U2 r2 U' R U' R' U2 r"],
  ["r' R U R U R' U' M' R' F R F'"], ["r U R' U' M2 U R U' R' U' M'"],
  ["r U R' U' r' R U R U' R'"], ["R U R' U' R U' R' F' U' F R U R'"],
  ["F R' F R2 U' R' U' R U R' F2"], ["R' U' F U R U' R' F' R"], ["L U F' U' L' U L F L'"],
  ["R U R' U' R' F R F'", 'T'], ["R U R2 U' R' F R U R U' F'"], ["R U2 R2 F R F' R U2 R'"],
  ["R' U' R U' R' U R U R B' R' B"], ["F R' F' R U R U' R'"], ["R U R' U R U' R' U' R' F R F'"],
  ["L F' L' U' L U F U' L'"], ["R' F R U R' U' F' U R"],
  ["R U R' U R U2 R' F R U R' U' F'"], ["R' U' R U' R' U2 R F R U R' U' F'"],
  ["f' L' U' L U f"], ["f R U R' U' f'"], ["F R U R' U' F'"],
  ["R' U' R' F R F' U R"], ["R' U' R' F R F' R' F R F' U R"], ["F R U R' U' R U R' U' F'"],
  ["R B' R2 F R2 B R2 F' R"], ["F U R U' R' U R U' R' F'"],
   ["r' U' R U' R' U R U' R' U2 r"], ["r U R' U R U' R' U R U2 r'"],
  ["R U2 R2 U' R U' R' U2 F R F'"], ["r U r' U R U' R' U R U' R' r U' r'"], ["R U R' U' M' U R U' r'"],
];

// Two-look building blocks (edge orientation); corners reuse the OCLL entries above.
export const EO = [["F R U R' U' F'", 'Line'], ["f R U R' U' f'", 'L-shape']];

export const PLL = [
  ["R' F R' B2 R F' R' B2 R2", 'Aa'], ["R2 B2 R F R' B2 R F' R", 'Ab'],
  [rot("R U' R' D R U R' D' R U R' D R U' R' D'", X_PRIME), 'E'],
  ["R' U' F' R U R' U' R' F R2 U' R' U' R U R' U R", 'F'],
  ["R2 U R' U R' U' R U' R2 U' D R' U R D'", 'Ga'], ["R' U' R U D' R2 U R' U R U' R U' R2 D", 'Gb'],
  ["R2 U' R U' R U R' U R2 U D' R U' R' D", 'Gc'], ["R U R' U' D R2 U' R U' R' U R' U R2 D'", 'Gd'],
  ["M2 U M2 U2 M2 U M2", 'H'], ["R' U L' U2 R U' R' U2 R L", 'Ja'], ["R U R' F' R U R' U' R' F R2 U' R'", 'Jb'],
  ["R U R' U R U R' F' R U R' U' R' F R2 U' R' U2 R U' R'", 'Na'], ["R' U R U' R' F' U' F R U R' F R' F' R U' R", 'Nb'],
  ["R U' R' U' R U R D R' U' R D' R' U2 R'", 'Ra'], ["R' U2 R U2 R' F R U R' U' R' F' R2", 'Rb'],
  ["R U R' U' R' F R2 U' R' U' R U R' F'", 'T'], ["R U' R U R U R U' R' U' R2", 'Ua'], ["R2 U R U R' U' R' U' R' U R'", 'Ub'],
  ["R' U R' U' " + rot("R' F' R2 U' R' U R' F R F", Y_ROT), 'V'], ["F R U' R' U' R U R' F' R U R' U' R' F R F'", 'Y'],
  ["M' U M2 U M2 U M' U2 M2", 'Z'],
];
