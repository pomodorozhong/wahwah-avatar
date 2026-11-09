// Five vertical sections traced at 8%, 25%, 50%, 75%, 92% of the graphic
// mouth in Alien Simulation's mX2oF5fGx1Y, sampled at 12 Hz around 3.3–4.5s.
// Each section records top, bottom, upper tooth depth and lower tooth depth
// in reference pixels. Only geometry and exposure timing ship with the app; the
// exposure timing is `grinFrames` and `roundFrames` in mouthPlan.ts.
// Copied from wahwah's codex/backup-puppet-experiments-2026-11-02 (4442a8c).
import * as THREE from 'three';

type Section = [number, number, number, number];
type Trace = [number, Section[]];
const traces: Trace[] = [
  [123, [[4,25,0,0],[8,39,7,0],[10,47,2,2],[14,43,7,2],[11,35,5,0]]],
  [132, [[2,46,0,0],[13,72,10,6],[21,80,11,8],[19,66,9,0],[16,42,0,0]]],
  [126, [[4,31,14,4],[11,55,14,19],[19,62,15,19],[19,52,13,8],[17,35,6,4]]],
  [130, [[2,25,0,0],[14,55,9,4],[22,63,10,7],[22,53,8,0],[20,37,0,0]]],
  [59,  [[4,29,1,0],[1,35,7,0],[0,37,9,0],[5,37,7,0],[12,33,0,0]]],
  [45,  [[9,36,0,0],[5,42,0,0],[0,42,0,0],[1,36,0,0],[6,32,0,0]]],
  [61,  [[11,32,0,0],[5,34,5,0],[1,33,8,0],[1,32,5,0],[4,24,0,0]]],
];

function strip(x: number[], top: number[], bottom: number[], color: number, z: number) {
  const points = x.map((v, i) => new THREE.Vector2(v, -top[i]))
    .concat(x.map((v, i) => new THREE.Vector2(v, -bottom[i])).reverse());
  const path = new THREE.Shape();
  const last = points[points.length - 1];
  path.moveTo((last.x + points[0].x) / 2, (last.y + points[0].y) / 2);
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length];
    path.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2);
  });
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(path), new THREE.MeshBasicMaterial({color}));
  mesh.position.z = z;
  return mesh;
}

export function makeReferenceMouths(): THREE.Group {
  const group = new THREE.Group();
  for (const [width, sections] of traces) {
    const shape = new THREE.Group();
    const x = [.08,.25,.5,.75,.92].map(f => (f - .5) * width);
    const top = sections.map(s => s[0]), bottom = sections.map(s => s[1]);
    const tips = [top[0] + 1, top[4] + 2];
    shape.add(strip([-width/2,...x,width/2], [tips[0],...top,tips[1]],
      [tips[0],...bottom,tips[1]], 0x090713, 0));
    shape.add(strip(x, top.map(v => v + 2.5), sections.map(s => s[0] + 2.5 + s[2]), 0xfff4ea, .65));
    shape.add(strip(x, sections.map(s => s[1] - 2.5 - s[3]), bottom.map(v => v - 2.5), 0xfff4ea, .65));
    if (!group.children.length) {
      const tongue = new THREE.Mesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({color: 0xc94551}));
      tongue.scale.set(14, 7, 1);
      tongue.position.set(0, -28, .9);
      shape.add(tongue);
    }
    // Convert traced pixels to mm and put the opening across the lip seam.
    shape.scale.setScalar(.31);
    shape.position.y = bottom[2] * .31 * .38;
    group.add(shape);
  }
  return group;
}
