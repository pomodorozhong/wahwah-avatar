// Mouth experiments for the VRoid "Constraint Twist" sample. Replacement
// mouths are separate cut pieces mounted on the head at the lip seam, drawn over
// the model's own mouth, which is held closed while a replacement is shown. The
// other modes patch the face materials' shaders to sculpt, outline or hinge the
// model's own mouth.
// Coordinates below are in metres in the sample's undeformed face mesh.
// Copied from wahwah's codex/backup-puppet-experiments-2026-11-02 (4442a8c).

import * as THREE from 'three';
import { MToonMaterial, type VRM } from '@pixiv/three-vrm';
import { NEUTRAL, type FaceControls } from 'wahwah/performance';
import {
  GestureReplay, PlateHold, blendControls, gestureScale, hingeAngle, hingeControls, replayPlates,
  type MouthMode,
} from './mouthPlan';
import { makeReferenceMouths } from './referenceMouth';

const lipCentre = new THREE.Vector3(0, 1.385, 0.081);
const lip = new THREE.Color('#9e384e');
const cavity = new THREE.Color('#371526');
const enamel = new THREE.Color('#fff3dc');
const tongue = new THREE.Color('#d5757e');

/** One cut piece. Points are mm around the lip seam; four quadratic arcs close it. */
function piece(color: THREE.Color, depth: number, points: number[]): THREE.Mesh {
  const path = new THREE.Shape();
  path.moveTo(points[0], points[1]);
  for (let i = 2; i < points.length; i += 4) {
    path.quadraticCurveTo(points[i], points[i + 1], points[i + 2], points[i + 3]);
  }
  path.closePath();
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(path), new THREE.MeshBasicMaterial({ color }));
  mesh.position.z = depth;
  return mesh;
}

/** A replacement mouth: lip rim, dark cavity, then optional teeth and tongue. */
function replacement(width: number, top: number, bottom: number, tilt: number, teeth: number): THREE.Group {
  const plate = new THREE.Group();
  const outline = (w: number, t: number, b: number) => [
    -w, 0, -w * 0.52, t * 1.4, 0, t, w * 0.72, t * 1.25, w, tilt,
    w * 0.62, -b * 1.35, 0, -b, -w * 0.67, -b * 1.1, -w, 0,
  ];
  plate.add(piece(teeth ? cavity : lip, 0, outline(width, top + 1.4, bottom + 1.6)));
  plate.add(piece(cavity, 0.25, outline(width * 0.91, top, bottom)));
  if (teeth > 0) {
    const w = width * 0.77;
    plate.add(piece(enamel, 0.48, [
      -w, top * 0.54, -w * 0.4, top * 1.13, 0, top * 0.89,
      w * 0.5, top * 1.06, w, tilt + 0.5, w * 0.42, top - teeth, 0, top - teeth,
      -w * 0.67, top - teeth - 0.5, -w, top * 0.54,
    ]));
  }
  if (teeth && bottom >= 4) {
    const depth = width > 20 ? 0.05 : 0.63;
    plate.add(piece(enamel, 0.48, [
      -width * 0.72, -bottom * 0.48, 0, -bottom * depth, width * 0.68, -bottom * 0.4,
      width * 0.34, -bottom * 0.97, 0, -bottom * 0.93, -width * 0.4, -bottom * 0.99, -width * 0.72, -bottom * 0.48,
    ]));
  } else if (bottom > 6) {
    plate.add(piece(tongue, 0.48, [
      -width * 0.5, -bottom * 0.64, 0, -bottom * 0.31, width * 0.55, -bottom * 0.62,
      0, -bottom * 1.15, -width * 0.5, -bottom * 0.64,
    ]));
  }
  return plate;
}

// The contour is drawn in face-plane coordinates, so it follows the skin and
// can take part in any later full-screen style pass.
const contourShader = `
  if (mouthContour > 0.5 && mouthRest.z > 0.057) {
    vec2 p = (mouthRest.xy - vec2(0.0, 1.385)) * 1000.0;
    float jaw = mouthShape.x, wide = mouthShape.y, roundness = mouthShape.z;
    float w = 15.5 + 8.5 * wide - 8.0 * roundness;
    float x = p.x / w;
    float arch = max(0.0, 1.0 - x * x);
    float seam = 2.2 * x * x + (wide - roundness) * x * 1.2;
    float upper = seam + (0.45 + 4.0 * jaw + 2.3 * roundness) * arch;
    float lower = seam - (0.45 + 12.0 * jaw + 1.8 * roundness) * arch;
    float side = w - abs(p.x);
    float inside = min(side, min(upper - p.y, p.y - lower));
    float aa = max(fwidth(p.y), 0.20);
    float rim = min(side + 0.6, min(upper + 1.6 * arch - p.y, p.y - lower + 2.1 * arch));
    col = mix(col, vec3(0.40, 0.048, 0.075), smoothstep(-aa, aa, rim));
    vec3 fill = vec3(0.046, 0.009, 0.020);
    float tooth = smoothstep(-aa, aa, p.y - upper + arch * (2.5 * jaw + 2.5 * wide));
    fill = mix(fill, vec3(0.95, 0.83, 0.70), tooth);
    float tongue = 1.0 - smoothstep(-aa, aa, p.y - lower - 3.0 * jaw * arch);
    fill = mix(fill, vec3(0.56, 0.13, 0.18), tongue * jaw);
    float bottomTeeth = 1.0 - smoothstep(-aa, aa, p.y - lower - arch * (1.2 * jaw + 3.6 * wide));
    fill = mix(fill, vec3(0.90, 0.82, 0.73), bottomTeeth * (1.0 - roundness));
    col = mix(col, fill, smoothstep(-aa, aa, inside));
  }
`;

// Tip the chin about a pivot behind the lip seam. Native aa first separates the
// upper/lower loops, so a smooth spatial mask can pick the lower lip and teeth.
const hingeShader = `
  float belowLip = 1.0 - smoothstep(1.380, 1.386, transformed.y);
  float front = smoothstep(0.022, 0.057, position.z);
  float angle = mouthHinge * belowLip * front;
  vec2 yz = transformed.yz - vec2(1.391, 0.015);
  transformed.yz = vec2(cos(angle) * yz.x - sin(angle) * yz.y,
                         sin(angle) * yz.x + cos(angle) * yz.y) + vec2(1.391, 0.015);
`;

const sculptLipShader = `
  if (mouthPaint > 0.5 && mouthRest.z > 0.057) {
    vec2 lipPoint = (mouthRest.xy - vec2(0.0, 1.385)) * 1000.0;
    float x = lipPoint.x / 16.0;
    float arch = max(0.0, 1.0 - x * x);
    float y = lipPoint.y - 1.8 * x * x;
    float edge = min(16.0 - abs(lipPoint.x), min(1.65 * arch - y, y + 2.3 * arch));
    float aa = max(fwidth(y), 0.2);
    col = mix(col, col * vec3(0.75, 0.12, 0.22), 0.88 * smoothstep(-aa, aa, edge));
  }
`;
const sculptCavityShader = `
  if (mouthPaint > 0.5) {
    // The sample atlas uses pink for soft tissue and neutral ivory for teeth.
    float tissue = smoothstep(0.11, 0.35, (col.r - col.g) / max(col.r, 0.001));
    col *= mix(vec3(1.0), vec3(0.21, 0.14, 0.22), tissue);
  }
`;

/**
 * The sample's face materials when `vrm` is the sample these mouths were cut
 * for, otherwise undefined. VRoid names every model's materials alike, so the
 * face mesh bounds are checked too.
 */
function sampleFaceMaterials(vrm: VRM): Set<MToonMaterial> | undefined {
  const materials = new Set<MToonMaterial>();
  let matched = false;
  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of list) {
      if (!(mat instanceof MToonMaterial) || !/^(Face_00_SKIN|FaceMouth_00_FACE)/.test(mat.name)) continue;
      materials.add(mat);
      if (/^Face_00_SKIN/.test(mat.name) && obj.morphTargetDictionary?.['Face_Blendshape.Fcl_MTH_A'] !== undefined) {
        const box = new THREE.Box3().setFromBufferAttribute(obj.geometry.getAttribute('position'));
        matched ||= Math.abs(box.min.y - 1.35218) < 0.001 && Math.abs(box.max.z - 0.08926) < 0.001;
      }
    }
  });
  return matched ? materials : undefined;
}

export class PuppetMouth {
  private readonly plates = new THREE.Group();
  private readonly reference = makeReferenceMouths();
  private readonly shape = { value: new THREE.Vector3() };
  private readonly contour = { value: 0 };
  private readonly paint = { value: 0 };
  private readonly hinge = { value: 0 };
  private readonly hold = new PlateHold();
  private readonly replay = new GestureReplay();
  private previousMode?: MouthMode;

  /** The mouth rig for this model, or undefined when it is not the sample. */
  static forModel(vrm: VRM): PuppetMouth | undefined {
    const head = vrm.humanoid.getRawBoneNode('head');
    const materials = sampleFaceMaterials(vrm);
    return head && materials ? new PuppetMouth(vrm, head, materials) : undefined;
  }

  private constructor(vrm: VRM, head: THREE.Object3D, materials: Set<MToonMaterial>) {
    this.plates.add(
      replacement(15, 0.55, 0.6, 0.5, 0), replacement(16, 3.0, 5, 1, 2.6),
      replacement(18, 5.5, 11, 1.8, 4), replacement(21, 3.5, 4.7, 2.8, 4),
      replacement(8, 3.8, 7.6, 0.4, 0),
    );
    const mount = new THREE.Group();
    mount.scale.setScalar(0.001);
    mount.position.copy(lipCentre);
    mount.add(this.plates, this.reference);
    this.plates.visible = this.reference.visible = false;
    vrm.scene.add(mount);
    vrm.scene.updateMatrixWorld(true);
    head.attach(mount);

    for (const mat of materials) {
      Object.assign(mat.uniforms, { mouthShape: this.shape, mouthContour: this.contour, mouthHinge: this.hinge, mouthPaint: this.paint });
      mat.vertexShader = 'uniform float mouthHinge; varying vec3 mouthRest;\n' + mat.vertexShader
        .replace('#include <morphtarget_vertex>', '#include <morphtarget_vertex>\nmouthRest = position;\n' + hingeShader);
      if (!mat.isOutline) {
        const treatment = /^Face_00_SKIN/.test(mat.name) ? sculptLipShader + contourShader : sculptCavityShader;
        mat.fragmentShader = 'uniform vec3 mouthShape; uniform float mouthContour, mouthPaint; varying vec3 mouthRest;\n'
          + mat.fragmentShader.replace('// -- Almost done!', treatment + '\n// -- Almost done!');
      }
      mat.needsUpdate = true;
    }
  }

  /** Apply the chosen mode and return the controls the VRM itself should use. */
  pose(mode: MouthMode, c: FaceControls, dt: number): FaceControls {
    const reset = this.previousMode !== mode || dt === 0;
    this.previousMode = mode;
    this.contour.value = Number(mode === 'contour');
    this.paint.value = Number(mode === 'hinge' || mode === 'blend' || mode === 'gesture');
    this.hinge.value = mode === 'hinge' ? hingeAngle(c) : 0;
    this.plates.visible = mode === 'plates' || mode === 'gesturePlates';
    this.reference.visible = false;
    if (mode === 'contour') {
      this.shape.value.set(c.jawOpen, c.lipWidth, c.lipRound);
      return NEUTRAL;
    }
    if (mode === 'hinge') return hingeControls(c);
    if (mode === 'blend') return blendControls(c);
    if (mode === 'plates') {
      if (reset) this.plates.scale.setScalar(1);
      const index = this.hold.next(c, dt, reset);
      this.plates.children.forEach((child, i) => { child.visible = i === index; });
      return NEUTRAL;
    }
    if (mode === 'gesturePlates' || mode === 'gesture') {
      const frame = this.replay.frame(c, dt, reset);
      const scale = gestureScale(c);
      if (mode === 'gesturePlates') {
        const pose = frame === null ? undefined : replayPlates[frame];
        this.plates.children.forEach((child, i) => { child.visible = i === (pose?.plate ?? 0); });
        if (pose) this.plates.scale.set(scale * pose.width, scale * pose.height, scale);
        else this.plates.scale.setScalar(1);
      } else if (frame !== null) {
        this.reference.visible = true;
        this.reference.scale.setScalar(scale);
        this.reference.children.forEach((child, i) => { child.visible = i === frame; });
      }
      return NEUTRAL;
    }
    return c;
  }
}
