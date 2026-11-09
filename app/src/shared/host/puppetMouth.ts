// Replacement mouths for the VRoid "Constraint Twist" sample. Each mouth is a
// separate cut piece mounted on the head at the lip seam, drawn over the
// model's own mouth, which is held closed while a replacement is shown.
// Coordinates below are in metres in the sample's undeformed face mesh.
// Copied from wahwah's codex/backup-puppet-experiments-2026-11-02 (4442a8c).

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { NEUTRAL, type FaceControls } from 'wahwah/performance';
import { GestureReplay, PlateHold, mouthEnergy, replayPlates, type MouthMode } from './mouthPlan';

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

/** True when the model is the sample these mouths were cut for. VRoid names every model's materials alike, so the face mesh bounds are checked too. */
function isSampleFace(vrm: VRM): boolean {
  let matched = false;
  vrm.scene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || obj.morphTargetDictionary?.['Face_Blendshape.Fcl_MTH_A'] === undefined) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    if (!list.some((m) => /^Face_00_SKIN/.test(m.name))) return;
    const box = new THREE.Box3().setFromBufferAttribute(obj.geometry.getAttribute('position'));
    matched ||= Math.abs(box.min.y - 1.35218) < 0.001 && Math.abs(box.max.z - 0.08926) < 0.001;
  });
  return matched;
}

export class PuppetMouth {
  private readonly plates = new THREE.Group();
  private readonly hold = new PlateHold();
  private readonly replay = new GestureReplay();
  private previousMode?: MouthMode;

  /** The mouth rig for this model, or undefined when it is not the sample. */
  static forModel(vrm: VRM): PuppetMouth | undefined {
    const head = vrm.humanoid.getRawBoneNode('head');
    return head && isSampleFace(vrm) ? new PuppetMouth(vrm, head) : undefined;
  }

  private constructor(vrm: VRM, head: THREE.Object3D) {
    this.plates.add(
      replacement(15, 0.55, 0.6, 0.5, 0), replacement(16, 3.0, 5, 1, 2.6),
      replacement(18, 5.5, 11, 1.8, 4), replacement(21, 3.5, 4.7, 2.8, 4),
      replacement(8, 3.8, 7.6, 0.4, 0),
    );
    const mount = new THREE.Group();
    mount.scale.setScalar(0.001);
    mount.position.copy(lipCentre);
    mount.add(this.plates);
    this.plates.visible = false;
    vrm.scene.add(mount);
    vrm.scene.updateMatrixWorld(true);
    head.attach(mount);
  }

  /** Show the chosen replacement and return the controls the VRM itself should use. */
  pose(mode: MouthMode, c: FaceControls, dt: number): FaceControls {
    const reset = this.previousMode !== mode || dt === 0;
    this.previousMode = mode;
    this.plates.visible = mode !== 'original';
    if (mode === 'plates') {
      if (reset) this.plates.scale.setScalar(1);
      const index = this.hold.next(c, dt, reset);
      this.plates.children.forEach((child, i) => { child.visible = i === index; });
      return NEUTRAL;
    }
    if (mode === 'gesturePlates') {
      const frame = this.replay.frame(c, dt, reset);
      const pose = frame === null ? undefined : replayPlates[frame];
      this.plates.children.forEach((child, i) => { child.visible = i === (pose?.plate ?? 0); });
      if (pose) {
        const scale = 0.57 + 0.43 * THREE.MathUtils.clamp(Math.sqrt(mouthEnergy(c)), 0, 1);
        this.plates.scale.set(scale * pose.width, scale * pose.height, scale);
      } else this.plates.scale.setScalar(1);
      return NEUTRAL;
    }
    return c;
  }
}
