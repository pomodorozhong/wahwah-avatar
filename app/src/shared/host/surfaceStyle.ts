import * as THREE from 'three';
import { MToonMaterial } from '@pixiv/three-vrm';
import type { RenderStyle } from './host';

/** Add procedural surface treatments while retaining MToon's rig and shadow support. */
export function applySurfaceStyle(scene: THREE.Object3D, style: RenderStyle): void {
  const materials = new Set<MToonMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    // Inverted hulls provide outlines but must not cast inflated shadows.
    object.castShadow = list.some((material) => material instanceof MToonMaterial && !material.isOutline);
    object.receiveShadow = true;
    for (const material of list) if (material instanceof MToonMaterial) materials.add(material);
  });
  for (const material of materials) {
    const detailed = /HAIR|CLOTH|SKIN/.test(material.name);
    material.defines.WAHWAH_STYLE = style === 'painted-toon' ? 1 : style === 'comic-print' ? 3 : 2;
    material.defines.WAHWAH_DETAIL = detailed ? 1 : 0;
    material.defines.WAHWAH_HAIR = /HAIR/.test(material.name) ? 1 : 0;
    if (style === 'comic-print') {
      const printPixelScale = { value: new THREE.Vector2(1, 1) };
      Object.assign(material.uniforms, { printPixelScale });
      const size = new THREE.Vector2();
      const beforeRender = material.onBeforeRender;
      material.onBeforeRender = function (renderer, ...args) {
        beforeRender.call(this, renderer, ...args);
        renderer.getSize(size);
        const target = renderer.getRenderTarget();
        // The comic pass caps its resolution independently of the canvas DPR.
        const x = target ? target.width / Math.max(1, size.x) : renderer.getPixelRatio();
        const y = target ? target.height / Math.max(1, size.y) : renderer.getPixelRatio();
        if (printPixelScale.value.x !== x || printPixelScale.value.y !== y) {
          printPixelScale.value.set(x, y);
          this.uniformsNeedUpdate = true;
        }
      };
    }
    // Painted pigment stays attached to the surface through every expression.
    material.vertexShader = 'varying vec3 surfacePosition;\n' + material.vertexShader.replace(
      'void main() {', 'void main() {\n surfacePosition = position;',
    );
    material.fragmentShader = `
      varying vec3 surfacePosition;
      #if WAHWAH_STYLE == 3
        uniform vec2 printPixelScale;
      #endif
      float surfaceLight = 0.0;
      float brushNoise(vec3 p) {
        return sin(p.x * 139.0 + sin(p.y * 41.0)) * sin(p.y * 73.0 + p.z * 97.0);
      }
    ` + material.fragmentShader
      .replace('float shading = dotNL;', 'surfaceLight = max(surfaceLight, clamp(0.3 + dotNL * 0.65, 0.0, 1.0) * shadow);\n float shading = dotNL;')
      .replace('// -- Almost done!', `
        #ifndef OUTLINE
          #if WAHWAH_HAIR == 1 && NUM_DIR_LIGHTS > 0
            vec3 halfDirection = normalize(viewDir + directionalLights[0].direction);
            float specularBand = smoothstep(0.88, 0.92, dot(normal, halfDirection));
            specularBand *= smoothstep(0.35, 0.7, surfaceLight);
            #if WAHWAH_STYLE == 1
              col = mix(col, vec3(0.65, 0.40, 0.16), specularBand * 0.65);
            #elif WAHWAH_STYLE == 3
              col = mix(col, vec3(0.60, 0.13, 0.24), specularBand * 0.75);
            #endif
          #endif
          #if WAHWAH_STYLE == 1 && WAHWAH_DETAIL == 1
            // Low-contrast pigment variation on top of the live lighting bands.
            col *= 1.0 + 0.035 * brushNoise(surfacePosition);
            float grazing = pow(1.0 - max(0.0, dot(normal, viewDir)), 3.0);
            col += vec3(0.08, 0.06, 0.025) * grazing * surfaceLight;
          #elif WAHWAH_STYLE == 2
            col = vec3(dot(col, vec3(0.2126, 0.7152, 0.0722)));
          #elif WAHWAH_STYLE == 3 && WAHWAH_DETAIL == 1
            // Fixed six-CSS-pixel print lattice: expressions affect ink coverage,
            // while dot centers and hatch lines stay anchored to the screen.
            vec2 printPosition = gl_FragCoord.xy / (printPixelScale * 6.0);
            vec2 grid = mat2(0.866, -0.5, 0.5, 0.866) * printPosition;
            vec2 cell = fract(grid) - 0.5;
            float radius = mix(0.36, 0.0, smoothstep(0.1, 0.7, surfaceLight));
            float feather = max(length(fwidth(grid)) * 0.45, 0.015);
            float dots = (1.0 - smoothstep(radius - feather, radius + feather, length(cell))) * smoothstep(0.0, 0.05, radius);
            float stripe = abs(fract(printPosition.x + printPosition.y * 0.72) - 0.5);
            float hatch = (1.0 - smoothstep(0.06, 0.06 + feather, stripe)) * (1.0 - smoothstep(0.15, 0.45, surfaceLight));
            vec3 ink = vec3(0.018, 0.008, 0.035);
            col = mix(col, ink, max(dots * 0.6, hatch * 0.7));
          #endif
        #endif
        // -- Almost done!`);
    material.needsUpdate = true;
  }
}
