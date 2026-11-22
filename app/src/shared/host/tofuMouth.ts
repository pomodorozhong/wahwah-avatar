// The mouth modes on Tofu. The drawn mouths sit on Tofu's front face, scaled
// from the sample's millimetres to Tofu's mouth; the ink contour is painted on
// its unlit skin; the other modes drive Tofu's own hinged mouth differently.
// The sample's closed drawings are far wider than Tofu's small resting mouth,
// so whenever a mode would show one, Tofu shows its own closed mouth instead.

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import { NEUTRAL, type FaceControls } from 'wahwah/performance';
import { blendControls, hingeControls, mouthEnergy, type MouthMode } from './mouthPlan';
import { CutMouths, contourShader, type MouthRig } from './puppetMouth';

// Tofu's face, in its sculpture units (see tools/tofu/cube-shell.mjs and cubes.mjs).
const FRONT_Z = 0.9;
const LIP_Y = -0.14;
/**
 * Tofu's jaw drops, so its upper lip stays near the lip line while the mouth
 * opens downward. Each drawn mouth hangs the same way: its top edge sits this
 * far above the line, about where the top of Tofu's small resting mouth is, so
 * a closing drawing hands over to the resting mouth without a jump.
 */
const TOP_Y = LIP_Y + 0.02;
/**
 * How far the lip seam moves at full weight of each body channel: brushInkBody in
 * tools/tofu/cube-motion.mjs evaluated at (0, LIP_Y, FRONT_Z). Keep in step with it.
 */
const BODY_HEIGHT = (LIP_Y + FRONT_Z) / (2 * FRONT_Z);
const DRIVE = new THREE.Vector3(0.155, 0.077, -0.105).multiplyScalar(BODY_HEIGHT);
const FOLLOW = new THREE.Vector3(0.053, 0.068, 0.111).multiplyScalar(BODY_HEIGHT);
/** The drawn mouths stand this far in front of the face, in sculpture units. */
const LIFT = 0.012;

/** Sculpture units per millimetre of the sample's drawings, chosen by eye so they open about as far as Tofu's own mouth. */
const UNITS_PER_MM = 0.016;

export class TofuMouth implements MouthRig {
  private readonly cut = new CutMouths(true);
  private readonly shape = { value: new THREE.Vector3() };
  private readonly contour = { value: 0 };
  private readonly hide = { value: 0 };
  private previousMode?: MouthMode;
  private readonly mount = this.cut.group;

  /** The mouth rig for Tofu, found by its jaw joint, or undefined for another model. */
  static forModel(vrm: VRM): TofuMouth | undefined {
    const sculpture = vrm.scene.getObjectByName('DialogueJaw')?.parent;
    return sculpture ? new TofuMouth(vrm, sculpture) : undefined;
  }

  private constructor(private readonly vrm: VRM, sculpture: THREE.Object3D) {
    const skins = new Set<THREE.MeshBasicMaterial>();
    vrm.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material instanceof THREE.MeshBasicMaterial && material.name !== 'ink') skins.add(material);
      }
    });
    for (const material of skins) this.patchSkin(material);

    this.mount.scale.setScalar(UNITS_PER_MM);
    this.placeDrawing();
    sculpture.add(this.mount);
  }

  /** Paint the ink contour on the front of the unlit skin; `mouthRest` is in sculpture units. */
  private patchSkin(material: THREE.MeshBasicMaterial): void {
    const before = material.onBeforeCompile;
    const beforeKey = material.customProgramCacheKey.bind(material);
    material.customProgramCacheKey = () => beforeKey() + '-tofu-mouth';
    material.onBeforeCompile = (shader, renderer) => {
      before.call(material, shader, renderer);
      Object.assign(shader.uniforms, { mouthShape: this.shape, mouthContour: this.contour, mouthHide: this.hide });
      shader.vertexShader = 'varying vec3 mouthRest;\n' + shader.vertexShader
        .replace('void main() {', 'void main() {\n mouthRest = position;');
      shader.fragmentShader = 'uniform vec3 mouthShape; uniform float mouthContour, mouthHide; varying vec3 mouthRest;\n'
        + shader.fragmentShader.replace('#include <opaque_fragment>', `{
          vec3 col = outgoingLight;
          // Under a drawn or painted mouth, paint Tofu's own closed mouth over with
          // the front skin's colour: its vertical blend from #f2f3f1 to white.
          if (mouthHide > 0.5 && mouthRest.z > ${(FRONT_Z - 0.1).toFixed(3)}
              && abs(mouthRest.x) < 0.08 && abs(mouthRest.y - (${LIP_Y.toFixed(3)})) < 0.07) {
            col = mix(vec3(0.888, 0.896, 0.880), vec3(1.0), (mouthRest.y + ${FRONT_Z.toFixed(3)}) / ${(2 * FRONT_Z).toFixed(3)});
          }
          ${contourShader(LIP_Y, 1 / UNITS_PER_MM, FRONT_Z - 0.05)}
          outgoingLight = col;
        }
        #include <opaque_fragment>`);
    };
    material.needsUpdate = true;
  }

  /**
   * Hang the drawing on show from Tofu's lip line, and carry it with the body
   * channels, which bend the face itself rather than a bone.
   */
  private placeDrawing(): void {
    const expressions = this.vrm.expressionManager;
    const top = (this.cut.top() ?? 0) * UNITS_PER_MM;
    this.mount.position.set(0, TOP_Y - top, FRONT_Z + LIFT)
      .addScaledVector(DRIVE, expressions?.getValue('drive') ?? 0)
      .addScaledVector(FOLLOW, expressions?.getValue('follow') ?? 0);
  }

  pose(mode: MouthMode, c: FaceControls, dt: number): FaceControls {
    const reset = this.previousMode !== mode || dt === 0;
    this.previousMode = mode;
    // The contour rests at the same threshold as the replacement drawings close.
    const contour = mode === 'contour' && mouthEnergy(c) >= 0.12;
    const cut = this.cut.show(mode, c, dt, reset);
    this.placeDrawing();
    this.contour.value = Number(contour);
    // Tofu's own mouth is painted over while a drawn or painted mouth is up.
    this.hide.value = Number(contour || cut === 'drawn');
    if (cut || mode === 'contour') {
      this.shape.value.set(c.jawOpen, c.lipWidth, c.lipRound);
      return NEUTRAL;
    }
    if (mode === 'hinge') return hingeControls(c);
    if (mode === 'blend') return blendControls(c);
    return c;
  }
}
