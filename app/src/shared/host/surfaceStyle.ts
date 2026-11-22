import * as THREE from 'three';
import { MToonMaterial } from '@pixiv/three-vrm';
import type { RenderStyle } from './host';

/** Add procedural surface treatments while retaining MToon's rig and shadow support. */
export function applySurfaceStyle(scene: THREE.Object3D, style: RenderStyle): void {
  const materials = new Set<MToonMaterial>();
  const unlit = new Set<THREE.MeshBasicMaterial>();
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const list = Array.isArray(object.material) ? object.material : [object.material];
    // Inverted hulls provide outlines but must not cast inflated shadows.
    object.castShadow = list.some((material) => material instanceof MToonMaterial && !material.isOutline);
    object.receiveShadow = true;
    for (const material of list) {
      if (material instanceof MToonMaterial) materials.add(material);
      // Tofu's surfaces are unlit, with their shading baked into vertex colours; its outlines are named `ink`.
      else if (material instanceof THREE.MeshBasicMaterial) unlit.add(material);
    }
  });
  for (const material of unlit) applyUnlitStyle(material, style);
  for (const material of materials) {
    const detailed = /HAIR|CLOTH|SKIN/.test(material.name);
    material.defines.WAHWAH_STYLE = style === 'painted-toon' ? 1 : style === 'comic-print' ? 3 : 2;
    material.defines.WAHWAH_DETAIL = detailed ? 1 : 0;
    material.defines.WAHWAH_HAIR = /HAIR/.test(material.name) ? 1 : 0;
    if (style === 'comic-print') Object.assign(material.uniforms, { printPixelScale: trackPrintScale(material) });
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

/**
 * Keep the comic print lattice six CSS pixels wide. The comic pass renders
 * through a target whose resolution is capped independently of the canvas DPR.
 */
function trackPrintScale(material: THREE.Material): { value: THREE.Vector2 } {
  const printPixelScale = { value: new THREE.Vector2(1, 1) };
  const size = new THREE.Vector2();
  const beforeRender = material.onBeforeRender;
  material.onBeforeRender = function (renderer, ...args) {
    beforeRender.call(this, renderer, ...args);
    renderer.getSize(size);
    const target = renderer.getRenderTarget();
    const x = target ? target.width / Math.max(1, size.x) : renderer.getPixelRatio();
    const y = target ? target.height / Math.max(1, size.y) : renderer.getPixelRatio();
    if (printPixelScale.value.x !== x || printPixelScale.value.y !== y) {
      printPixelScale.value.set(x, y);
      // MToon is a ShaderMaterial and needs the flag; a built-in material re-uploads when its program or material changes.
      (this as { uniformsNeedUpdate?: boolean }).uniformsNeedUpdate = true;
    }
  };
  return printPixelScale;
}

/**
 * The three looks for an unlit model such as Tofu. With no live lighting, the
 * baked vertex colour's brightness stands in for how lit the surface is.
 */
function applyUnlitStyle(material: THREE.MeshBasicMaterial, style: RenderStyle): void {
  if (style === 'standard') return;
  const id = style === 'painted-toon' ? 1 : style === 'comic-print' ? 3 : 2;
  const outline = material.name === 'ink';
  const printPixelScale = id === 3 && !outline ? trackPrintScale(material) : undefined;
  // Chain any earlier patch, such as Tofu's mouth contour.
  const before = material.onBeforeCompile;
  const beforeKey = material.customProgramCacheKey.bind(material);
  material.customProgramCacheKey = () => `${beforeKey()}-wahwah-unlit-${id}-${outline}`;
  material.onBeforeCompile = (shader, renderer) => {
    before.call(material, shader, renderer);
    shader.defines = { ...shader.defines, WAHWAH_STYLE: id, WAHWAH_OUTLINE: outline ? 1 : 0 };
    if (printPixelScale) shader.uniforms.printPixelScale = printPixelScale;
    shader.vertexShader = 'varying vec3 surfacePosition;\nvarying vec3 styleViewPosition;\n' + shader.vertexShader
      .replace('void main() {', 'void main() {\n surfacePosition = position;')
      .replace('#include <project_vertex>', '#include <project_vertex>\n styleViewPosition = mvPosition.xyz;');
    shader.fragmentShader = `
      varying vec3 surfacePosition;
      varying vec3 styleViewPosition;
      uniform vec2 printPixelScale;
      float brushNoise(vec3 p) {
        return sin(p.x * 139.0 + sin(p.y * 41.0)) * sin(p.y * 73.0 + p.z * 97.0);
      }
    ` + shader.fragmentShader.replace('#include <opaque_fragment>', `
      {
        vec3 col = outgoingLight;
        float tone = sqrt(dot(col, vec3(0.2126, 0.7152, 0.0722)));
        #if WAHWAH_OUTLINE == 1
          // Outlines take each style's line colour, as the remade sample models do.
          #if WAHWAH_STYLE == 1
            col = vec3(0.16, 0.10, 0.06);
          #elif WAHWAH_STYLE == 3
            col = vec3(0.10, 0.04, 0.12);
          #endif
        #elif WAHWAH_STYLE == 1
          vec3 viewDir = normalize(-styleViewPosition);
          // Faceted normal from screen derivatives: Tofu's cuts are flat anyway.
          vec3 faceNormal = normalize(cross(dFdx(styleViewPosition), dFdy(styleViewPosition)));
          float grazing = pow(1.0 - abs(dot(faceNormal, viewDir)), 3.0);
          // Gather the baked gradient into three flat paint bands, cool in shadow and warm in light.
          float band = 0.66 + 0.18 * smoothstep(0.76, 0.8, tone) + 0.16 * smoothstep(0.92, 0.95, tone);
          // Dark marks such as the eyes keep their own pigment.
          col *= mix(1.0, band / max(tone, 0.05), 0.85 * smoothstep(0.5, 0.6, tone));
          col *= mix(vec3(0.80, 0.90, 0.92), vec3(1.0, 0.95, 0.84), smoothstep(0.7, 0.95, tone));
          col *= 1.0 + 0.07 * brushNoise(surfacePosition);
          col += vec3(0.10, 0.07, 0.025) * grazing;
        #elif WAHWAH_STYLE == 2
          // Pull the pale body down to mid-grey so the ink pass has tones to dither.
          float grey = mix(0.25, 0.66, smoothstep(0.6, 0.98, tone));
          col = vec3(grey * grey);
        #else
          // The same six-CSS-pixel print lattice as the comic MToon patch.
          float surfaceLight = smoothstep(0.6, 1.0, tone);
          col *= mix(vec3(0.78, 0.92, 1.0), vec3(1.0), surfaceLight);
          vec2 printPosition = gl_FragCoord.xy / (printPixelScale * 6.0);
          vec2 grid = mat2(0.866, -0.5, 0.5, 0.866) * printPosition;
          vec2 cell = fract(grid) - 0.5;
          float radius = mix(0.42, 0.0, smoothstep(0.2, 0.95, surfaceLight));
          float feather = max(length(fwidth(grid)) * 0.45, 0.015);
          float dots = (1.0 - smoothstep(radius - feather, radius + feather, length(cell))) * smoothstep(0.0, 0.05, radius);
          float stripe = abs(fract(printPosition.x + printPosition.y * 0.72) - 0.5);
          float hatch = (1.0 - smoothstep(0.06, 0.06 + feather, stripe)) * (1.0 - smoothstep(0.1, 0.35, surfaceLight));
          col = mix(col, vec3(0.018, 0.008, 0.035), max(dots * 0.6, hatch * 0.7));
        #endif
        outgoingLight = col;
      }
      #include <opaque_fragment>`);
  };
  material.needsUpdate = true;
}
